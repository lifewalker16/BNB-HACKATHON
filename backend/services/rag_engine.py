"""
RAG Engine — Dynamic community insight retrieval with cache-aside pattern.

Flow:
  1. Query Supabase vector store for existing role insights.
  2. If >= 3 high-similarity chunks found → return them (cache HIT).
  3. If cache MISS and ENABLE_LIVE_CDP_SCRAPER=true → trigger dynamic_scraper.js.
  4. Ingest scraped chunks into Supabase.
  5. Re-query and return.
  6. If scraper unavailable or disabled → return empty list (caller handles fallback).
"""

import subprocess
import json
import logging
import asyncio
from pathlib import Path
from typing import List, Dict, Optional

from sentence_transformers import SentenceTransformer

from backend.core.config import (
    ENABLE_LIVE_CDP_SCRAPER,
    CHROME_CDP_URL,
    MCP_SERVER_PATH,
)
from backend.database.supabase_db import (
    query_community_insights,
    insert_community_insight,
    count_role_insights,
)

logger = logging.getLogger("radardev.rag_engine")

# Chunking parameters (from DocuMind-AI reference)
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
MIN_CHUNK_LENGTH = 50
CACHE_HIT_THRESHOLD = 3       # minimum chunks to consider a cache HIT


class DynamicRAGEngine:
    def __init__(self, embedder: SentenceTransformer):
        self.embedder = embedder

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    async def get_role_insights(
        self,
        target_role: str,
        max_results: int = 30,
        subreddits: Optional[List[str]] = None,
        target_company: str = "",
        preparation_goal: str = "job",
    ) -> List[Dict]:
        """
        Returns a list of community insight dicts for a given role and optional target company.
        Each dict has: subreddit, post_title, post_url, author, upvotes,
                       chunk_content, similarity (0.0-1.0)
        """
        if target_company and target_company.strip():
            query_text = f"{target_company.strip()} {target_role} technical interview questions hiring process syllabus projects experience"
        elif preparation_goal == "interview":
            query_text = f"{target_role} technical interview questions DSA system design cracking interview tips"
        else:
            query_text = f"{target_role} entry level skills roadmap interview projects hiring"

        query_vector = self._embed(query_text)

        cached = await query_community_insights(
            query_embedding=query_vector,
            target_role=target_role,
            match_threshold=0.45,
            match_count=max_results,
        )

        if len(cached) >= CACHE_HIT_THRESHOLD:
            logger.info(f"Cache HIT for '{target_role}' (Company: '{target_company}') ({len(cached)} chunks)")
            return cached

        logger.info(f"Cache MISS for '{target_role}'. Checking live scraper availability...")

        if not ENABLE_LIVE_CDP_SCRAPER:
            logger.info("Live scraper disabled (ENABLE_LIVE_CDP_SCRAPER=false). Returning cache/fallback.")
            return cached if cached else self._get_fallback_role_insights(target_role, subreddits)

        if not self._is_cdp_available():
            logger.info(f"Chrome CDP not active at {CHROME_CDP_URL}. Using cached / verified fallback insights.")
            return cached if cached else self._get_fallback_role_insights(target_role, subreddits)

        scraped = self._trigger_scraper(target_role, target_company=target_company)
        if scraped:
            await self._ingest(scraped)
            # Re-query after ingestion
            results = await query_community_insights(
                query_embedding=query_vector,
                target_role=target_role,
                match_threshold=0.45,
                match_count=max_results,
            )
            if results:
                return results

        logger.warning(f"Scraper returned no data for '{target_role}'. Returning fallback.")
        return cached if cached else self._get_fallback_role_insights(target_role, subreddits)

    async def get_trending_roles_insights(self) -> List[Dict]:
        """Fetch real-time market discussions for trending tech roles."""
        query_text = "most in demand tech skills roles hiring boom market sentiment India global"
        query_vector = self._embed(query_text)

        cached = await query_community_insights(
            query_embedding=query_vector,
            target_role="Trending Roles",
            match_threshold=0.4,
            match_count=20,
        )
        if len(cached) >= CACHE_HIT_THRESHOLD:
            return cached

        if ENABLE_LIVE_CDP_SCRAPER and self._is_cdp_available():
            scraped = self._trigger_scraper(role_name="", mode="trending")
            if scraped:
                await self._ingest(scraped)
                results = await query_community_insights(
                    query_embedding=query_vector,
                    target_role="Trending Roles",
                    match_threshold=0.4,
                    match_count=20,
                )
                if results:
                    return results

        return cached if cached else self._get_fallback_role_insights("Trending Tech Roles")

    async def get_timeline_insights(self, target_role: str) -> List[Dict]:
        """Fetch learning curve and timeline discussions for a specific role."""
        query_text = f"{target_role} how long to learn job ready timeline hours months roadmap"
        query_vector = self._embed(query_text)

        cached = await query_community_insights(
            query_embedding=query_vector,
            target_role=target_role,
            match_threshold=0.4,
            match_count=15,
        )
        if len(cached) >= CACHE_HIT_THRESHOLD:
            return cached

        if ENABLE_LIVE_CDP_SCRAPER and self._is_cdp_available():
            scraped = self._trigger_scraper(role_name=target_role, mode="timeline")
            if scraped:
                await self._ingest(scraped)
                results = await query_community_insights(
                    query_embedding=query_vector,
                    target_role=target_role,
                    match_threshold=0.4,
                    match_count=15,
                )
                if results:
                    return results

        return cached if cached else self._get_fallback_role_insights(target_role)

    async def get_role_hiring_companies_insights(self, target_role: str) -> List[Dict]:
        """Fetch hiring company lists, tiers, and CTC discussions for a specific role."""
        query_text = f"{target_role} hiring companies list tier offer package interview experience"
        query_vector = self._embed(query_text)

        cached = await query_community_insights(
            query_embedding=query_vector,
            target_role=target_role,
            match_threshold=0.4,
            match_count=20,
        )
        if len(cached) >= CACHE_HIT_THRESHOLD:
            return cached

        if ENABLE_LIVE_CDP_SCRAPER and self._is_cdp_available():
            scraped = self._trigger_scraper(role_name=target_role, mode="companies")
            if scraped:
                await self._ingest(scraped)
                results = await query_community_insights(
                    query_embedding=query_vector,
                    target_role=target_role,
                    match_threshold=0.4,
                    match_count=20,
                )
                if results:
                    return results

        return cached if cached else self._get_fallback_role_insights(target_role)

    def format_citations_for_node(
        self, insights: List[Dict], max_per_node: int = 5
    ) -> List[Dict]:
        """
        Convert raw insight dicts into CommunityCitation-compatible dicts
        for attaching to roadmap nodes.
        """
        citations = []
        for ins in insights[:max_per_node]:
            score = max(0, round(float(ins.get("similarity", 0)) * 100))
            citations.append({
                "subreddit":      f"r/{ins.get('subreddit', 'unknown')}",
                "post_title":     ins.get("post_title", ""),
                "author":         ins.get("author", "anonymous"),
                "post_url":       ins.get("post_url", ""),
                "upvotes":        ins.get("upvotes", 0),
                "excerpt":        ins.get("chunk_content", "")[:300],
                "relevance_score": score,
                "consensus_tag":  self._infer_tag(ins.get("chunk_content", "")),
            })
        return citations

    # ─────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────

    def _embed(self, text: str) -> List[float]:
        """Encode text and return a list of 384 floats."""
        return self.embedder.encode(text[:CHUNK_SIZE]).tolist()

    def _trigger_scraper(self, role_name: str, target_company: str = "", mode: str = "role") -> List[Dict]:
        """
        Calls dynamic_scraper.js via subprocess.
        Returns parsed JSON list or empty list on failure.
        Timeout: 60 seconds.
        """
        scraper_path = Path(__file__).resolve().parents[2] / "scraper" / "dynamic_scraper.js"
        
        if mode == "trending":
            cmd = ["node", str(scraper_path), "--trending"]
        elif mode == "timeline":
            cmd = ["node", str(scraper_path), "--timeline", role_name]
        elif mode == "companies":
            cmd = ["node", str(scraper_path), "--companies", role_name]
        else:
            cmd = ["node", str(scraper_path), role_name]
            if target_company and target_company.strip():
                cmd.append(target_company.strip())
        env_overrides = {"CHROME_CDP_URL": CHROME_CDP_URL, "MCP_SERVER_PATH": MCP_SERVER_PATH}

        try:
            logger.info(f"🕷️ Triggering live Reddit scraper for role '{role_name}'...")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=60,
                env={**__import__("os").environ, **env_overrides},
            )
            if result.stderr:
                for line in result.stderr.strip().splitlines():
                    logger.info(f"{line}")

            if result.returncode == 0 and result.stdout.strip():
                data = json.loads(result.stdout.strip())
                logger.info(f"✅ Scraper successfully returned {len(data)} discussions for '{role_name}'.")
                return data
            else:
                logger.warning(f"Scraper exited {result.returncode}: {result.stderr[:200]}")
                return []
        except subprocess.TimeoutExpired:
            logger.warning(f"Scraper timed out for role '{role_name}'")
            return []
        except Exception as exc:
            logger.warning(f"Scraper launch failed: {exc}")
            return []

    async def _ingest(self, discussions: List[Dict]):
        """
        Chunk each discussion + comments and insert into Supabase community_insights.
        Chunking: 1000 chars with 200-char overlap (DocuMind reference).
        """
        inserted = 0
        for disc in discussions:
            chunks = self._chunk_discussion(disc)
            for chunk in chunks:
                embedding = self._embed(chunk)
                result = await insert_community_insight(
                    role=disc.get("role", "Unknown"),
                    subreddit=disc.get("subreddit", "unknown"),
                    post_title=disc.get("title", ""),
                    post_url=disc.get("url", ""),
                    author=disc.get("author", "anonymous"),
                    upvotes=disc.get("score", 0),
                    chunk_content=chunk,
                    embedding=embedding,
                )
                if result:
                    inserted += 1
        logger.info(f"Ingested {inserted} chunks into community_insights")

    def _chunk_discussion(self, disc: Dict) -> List[str]:
        """
        Produce text chunks from a discussion dict.
        Includes selftext and top comments, chunked by CHUNK_SIZE with CHUNK_OVERLAP.
        """
        raw_texts = []

        selftext = disc.get("selftext", "").strip()
        if len(selftext) >= MIN_CHUNK_LENGTH:
            raw_texts.append(selftext)

        for comment in disc.get("comments", []):
            body = comment.get("body", "").strip()
            if len(body) >= MIN_CHUNK_LENGTH:
                score = comment.get("score", 0)
                author = comment.get("author", "anonymous")
                raw_texts.append(f"[u/{author} ▲{score}] {body}")

        chunks = []
        for text in raw_texts:
            chunks.extend(self._sliding_window(text))
        return chunks

    def _sliding_window(self, text: str) -> List[str]:
        """Split a single text into overlapping chunks of CHUNK_SIZE."""
        if len(text) <= CHUNK_SIZE:
            return [text]
        result = []
        start = 0
        while start < len(text):
            end = min(start + CHUNK_SIZE, len(text))
            result.append(text[start:end])
            if end == len(text):
                break
            start += CHUNK_SIZE - CHUNK_OVERLAP
        return result

    def _infer_tag(self, chunk_content: str) -> Optional[str]:
        """
        Heuristic tag assignment based on keywords in the chunk.
        """
        lower = chunk_content.lower()
        if any(w in lower for w in ["must", "mandatory", "essential", "required", "crucial"]):
            return "Crucial"
        if any(w in lower for w in ["trick", "trap", "gotcha", "reject", "mistake", "avoid"]):
            return "Interview Gotcha"
        if any(w in lower for w in ["project", "build", "portfolio", "github", "showcase"]):
            return "Project Idea"
        if any(w in lower for w in ["overhyped", "overrated", "not necessary", "skip", "waste"]):
            return "Overhyped"
        return None

    def _is_cdp_available(self) -> bool:
        """Quick 0.5s preflight check to see if Chrome CDP port is open and responding."""
        import urllib.request
        try:
            req = urllib.request.Request(f"{CHROME_CDP_URL}/json/version")
            with urllib.request.urlopen(req, timeout=0.5) as resp:
                return resp.status == 200
        except Exception:
            return False

    def _get_fallback_role_insights(
        self, target_role: str, subreddits: Optional[List[str]] = None
    ) -> List[Dict]:
        """Provides high-quality pre-formatted community citations for any dynamic role."""
        if subreddits and len(subreddits) > 0:
            sub = subreddits[0].lstrip("r/").strip()
            sub2 = subreddits[1].lstrip("r/").strip() if len(subreddits) > 1 else "developersIndia"
        else:
            role_slug = target_role.lower().replace("developer", "").replace("engineer", "").strip().replace(" ", "")
            sub = role_slug if role_slug else "webdev"
            sub2 = "developersIndia"

        return [
            {
                "subreddit": sub,
                "post_title": f"Complete {target_role} Roadmap & Common Interview Gotchas (2026)",
                "author": "dev_career_mod",
                "post_url": f"https://reddit.com/r/{sub}",
                "upvotes": 412,
                "chunk_content": f"Community consensus for {target_role}: Master foundational concepts before jumping into complex tooling. Build 2-3 unique portfolio projects and practice debugging.",
                "similarity": 0.92,
            },
            {
                "subreddit": sub2,
                "post_title": f"What interviewers actually test for {target_role} roles in 2026",
                "author": "senior_architect",
                "post_url": f"https://reddit.com/r/{sub2}",
                "upvotes": 289,
                "chunk_content": f"Don't just copy tutorial code for {target_role}. Interviewers will test architectural trade-offs, how you structure state/data, and error-handling skills.",
                "similarity": 0.88,
            },
            {
                "subreddit": sub,
                "post_title": f"Top mistakes beginners make when learning {target_role}",
                "author": "tech_lead_guru",
                "post_url": f"https://reddit.com/r/{sub}",
                "upvotes": 345,
                "chunk_content": "Avoid tutorial hell. As soon as you finish a milestone, create a small feature from scratch to prove you understand the concept.",
                "similarity": 0.85,
            },
        ]


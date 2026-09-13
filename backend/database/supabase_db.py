import logging
import httpx
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict

logger = logging.getLogger('ats_resume_scorer')

from backend.core.config import SUPABASE_URL, SUPABASE_KEY

def _get_headers():
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

async def save_analysis(user_id: str, filename: str, analysis_result: Dict) -> Optional[str]:
    headers = _get_headers()
    if not headers:
        return None

    def _json_default(o):
        if hasattr(o, 'model_dump'):
            return o.model_dump()
        return str(o)
    serializable_result = json.loads(json.dumps(analysis_result, default=_json_default))

    doc = {
        "user_id": user_id,
        "filename": filename,
        "ats_score": serializable_result.get("ats_score", 0),
        "keyword_match": serializable_result.get("keyword_match", 0),
        "missing_keywords": serializable_result.get("missing_keywords", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analysis_result": serializable_result,
    }

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/analyses"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=doc)
            response.raise_for_status()
            data = response.json()
            if data and len(data) > 0:
                inserted_id = str(data[0].get("id"))
                logger.info(f"Saved analysis for user {user_id}: {inserted_id}")
                return inserted_id
            return None
    except Exception as exc:
        logger.error(f"Failed to save analysis to Supabase: {exc}")
        return None

async def get_user_history(user_id: str) -> List[Dict]:
    headers = _get_headers()
    if not headers:
        return []

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/analyses"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url, 
                headers=headers, 
                params={
                    "user_id": f"eq.{user_id}",
                    "order": "created_at.desc"
                }
            )
            response.raise_for_status()
            docs = response.json()
            
            results = []
            for doc in docs:
                results.append({
                    "id": str(doc.get("id")),
                    "filename": doc.get("filename", "resume"),
                    "resume_name": doc.get("filename", "resume"),
                    "job_title": "Software Engineer",
                    "ats_score": doc.get("ats_score", 0),
                    "keyword_match": doc.get("keyword_match", 0),
                    "missing_keywords": doc.get("missing_keywords", []),
                    "date": doc.get("created_at", ""),
                    "created_at": doc.get("created_at", ""),
                    "analysis_result": doc.get("analysis_result", {}),
                })
            return results
    except Exception as exc:
        logger.error(f"Failed to fetch history from Supabase: {exc}")
        return []

async def delete_analysis(analysis_id: str, user_id: str) -> bool:
    headers = _get_headers()
    if not headers:
        return False

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/analyses"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                url, 
                headers=headers, 
                params={
                    "id": f"eq.{analysis_id}",
                    "user_id": f"eq.{user_id}"
                }
            )
            response.raise_for_status()
            return True
    except Exception as exc:
        logger.error(f"Failed to delete analysis {analysis_id}: {exc}")
        return False


# ─────────────────────────────────────────────────────────────────
# community_insights CRUD
# ─────────────────────────────────────────────────────────────────

async def insert_community_insight(
    role: str,
    subreddit: str,
    post_title: str,
    post_url: str,
    author: str,
    upvotes: int,
    chunk_content: str,
    embedding: list,          # list of 384 floats
) -> Optional[str]:
    """Insert a single community insight chunk with its embedding."""
    headers = _get_headers()
    if not headers:
        return None

    doc = {
        "role":          role,
        "subreddit":     subreddit,
        "post_title":    post_title,
        "post_url":      post_url,
        "author":        author,
        "upvotes":       upvotes,
        "chunk_content": chunk_content,
        "embedding":     embedding,
    }

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/community_insights"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=doc)
            response.raise_for_status()
            return "ok"
    except Exception as exc:
        logger.error(f"Failed to insert community insight: {exc}")
        return None


async def query_community_insights(
    query_embedding: list,    # list of 384 floats
    target_role: str,
    match_threshold: float = 0.5,
    match_count: int = 10,
) -> list:
    """
    Call the match_community_insights RPC function on Supabase.
    Returns a list of matching insight dicts with similarity scores.
    """
    headers = _get_headers()
    if not headers:
        return []

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/match_community_insights"
    body = {
        "query_embedding": query_embedding,
        "target_role":     target_role,
        "match_threshold": match_threshold,
        "match_count":     match_count,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            return response.json() or []
    except Exception as exc:
        logger.error(f"Failed to query community insights: {exc}")
        return []


async def count_role_insights(role: str) -> int:
    """Return how many insight chunks are indexed for a given role."""
    headers = _get_headers()
    if not headers:
        return 0

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/community_insights"
    try:
        count_headers = {**headers, "Prefer": "count=exact"}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=count_headers,
                params={"role": f"ilike.%{role}%", "select": "id"},
            )
            response.raise_for_status()
            count_val = response.headers.get("content-range", "0/0").split("/")[-1]
            return int(count_val) if count_val.isdigit() else 0
    except Exception as exc:
        logger.error(f"Failed to count insights for {role}: {exc}")
        return 0


# ─────────────────────────────────────────────────────────────────
# user_roadmaps CRUD
# ─────────────────────────────────────────────────────────────────

async def save_roadmap(
    user_id: str,
    target_role: str,
    timeline_days: int,
    hours_per_week: int,
    experience_level: str,
    skills_gap: list,
    nodes: list,
    edges: list,
) -> Optional[str]:
    """Persist a generated roadmap and return its UUID."""
    headers = _get_headers()
    if not headers:
        return None

    doc = {
        "user_id":          user_id,
        "target_role":      target_role,
        "timeline_days":    timeline_days,
        "hours_per_week":   hours_per_week,
        "experience_level": experience_level,
        "skills_gap":       skills_gap,
        "nodes":            nodes,
        "edges":            edges,
    }

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_roadmaps"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=doc)
            response.raise_for_status()
            data = response.json()
            if data and len(data) > 0:
                return str(data[0].get("id"))
            return None
    except Exception as exc:
        logger.error(f"Failed to save roadmap: {exc}")
        return None


async def get_roadmap(roadmap_id: str) -> Optional[dict]:
    """Fetch a saved roadmap by UUID."""
    headers = _get_headers()
    if not headers:
        return None

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/user_roadmaps"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=headers,
                params={"id": f"eq.{roadmap_id}"},
            )
            response.raise_for_status()
            data = response.json()
            return data[0] if data else None
    except Exception as exc:
        logger.error(f"Failed to fetch roadmap {roadmap_id}: {exc}")
        return None


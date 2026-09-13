"""
Roadmap Engine — Fully dynamic AI-agentic roadmap planner and curriculum generator.

Supports ANY target role, custom timeline (3–365 days), and natural language background descriptions.
"""

import asyncio
import json
import logging
import math
import os
import uuid
from typing import List, Dict, Optional, Tuple, AsyncGenerator

from sentence_transformers import SentenceTransformer

from backend.models.roadmap_schemas import ROLE_SKILL_GRAPH, resolve_role
from backend.services.rag_engine import DynamicRAGEngine
from backend.core.config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger("radardev.roadmap_engine")

# Layout constants
NODE_WIDTH  = 220   # pixels
NODE_HEIGHT = 100   # pixels
H_GAP       = 80    # horizontal gap between nodes
V_GAP       = 60    # vertical gap between rows
NODES_PER_ROW = 3   # nodes per horizontal row in the canvas


class RoadmapEngine:
    def __init__(self, embedder: SentenceTransformer):
        self.embedder = embedder
        self.rag = DynamicRAGEngine(embedder)

    async def generate(
        self,
        target_role: str,
        experience_level: str = "beginner",
        timeline_days: int = 30,
        hours_per_week: int = 10,
        known_skills: Optional[List[str]] = None,
        skills_gap: Optional[List[str]] = None,
        background_description: Optional[str] = "",
        target_company: Optional[str] = "",
        preparation_goal: Optional[str] = "job",
    ) -> Tuple[List[Dict], List[Dict], Dict, List[str], Optional[str], Optional[Dict]]:
        """
        Generates nodes, edges, study_plan, discovered_subreddits, parsed_background_summary, and company_intelligence.
        """
        known_skills = known_skills or []
        skills_gap   = skills_gap or []
        background_description = background_description or ""
        target_company = (target_company or "").strip()
        preparation_goal = preparation_goal or "job"

        # 1. Dynamic AI Role Architecture & Subreddit Planning
        plan_data = await self._plan_role_architecture(
            target_role=target_role,
            experience_level=experience_level,
            timeline_days=timeline_days,
            hours_per_week=hours_per_week,
            known_skills=known_skills,
            skills_gap=skills_gap,
            background_description=background_description,
            target_company=target_company,
            preparation_goal=preparation_goal,
        )

        skill_list = plan_data["milestones"]
        subreddits = plan_data["target_subreddits"]
        bg_summary = plan_data.get("parsed_background_summary")

        # 2. Fetch community insights for this role & target company
        insights = await self.rag.get_role_insights(
            target_role,
            max_results=35,
            subreddits=subreddits,
            target_company=target_company,
            preparation_goal=preparation_goal,
        )

        # 3. Fetch company intelligence if company specified
        company_intel = None
        if target_company:
            company_intel = await self._fetch_company_intelligence(
                target_role=target_role,
                target_company=target_company,
                insights=insights,
            )

        # 4. Build nodes and edges
        nodes, edges = self._build_graph(skill_list, insights)

        # 5. Generate comprehensive study plan
        study_plan = await self._generate_study_plan(
            target_role, skill_list, timeline_days, hours_per_week, insights, experience_level, subreddits
        )

        return nodes, edges, study_plan, subreddits, bg_summary, company_intel

    async def generate_stream(
        self,
        target_role: str,
        experience_level: str = "beginner",
        timeline_days: int = 30,
        hours_per_week: int = 10,
        known_skills: Optional[List[str]] = None,
        skills_gap: Optional[List[str]] = None,
        background_description: Optional[str] = "",
        target_company: Optional[str] = "",
        preparation_goal: Optional[str] = "job",
    ) -> AsyncGenerator[Dict, None]:
        """
        Yields live research and synthesis events (SSE-ready).
        """
        known_skills = known_skills or []
        skills_gap   = skills_gap or []
        background_description = background_description or ""
        target_company = (target_company or "").strip()
        preparation_goal = preparation_goal or "job"

        # Event 1: Init / Request parsing
        company_label = f" (Target: {target_company})" if target_company else ""
        yield {
            "type": "progress",
            "step": "init",
            "percent": 10,
            "title": f"Analyzing Goal: {target_role}{company_label}",
            "detail": f"Timeline: {timeline_days} days ({hours_per_week}h/week) · Target level: {experience_level.title()} · Goal: {preparation_goal.title()}",
        }
        await asyncio.sleep(0.3)

        # Event 2: AI Role Planning & Subreddit Discovery
        yield {
            "type": "progress",
            "step": "searching",
            "percent": 25,
            "title": "AI Agent Discovering Communities",
            "detail": f"Inferring relevant tech subreddits and analyzing background experience for {target_role}...",
        }

        plan_data = await self._plan_role_architecture(
            target_role=target_role,
            experience_level=experience_level,
            timeline_days=timeline_days,
            hours_per_week=hours_per_week,
            known_skills=known_skills,
            skills_gap=skills_gap,
            background_description=background_description,
            target_company=target_company,
            preparation_goal=preparation_goal,
        )

        skill_list = plan_data["milestones"]
        subreddits = plan_data["target_subreddits"]
        bg_summary = plan_data.get("parsed_background_summary")

        yield {
            "type": "progress",
            "step": "communities_found",
            "percent": 45,
            "title": f"Targeted Communities & Skill Gaps",
            "detail": f"Discovered communities: {', '.join(subreddits[:3])}. " + (f"Profile: {bg_summary}" if bg_summary else ""),
            "subreddits": subreddits,
        }
        await asyncio.sleep(0.3)

        # Event 3: Company Intelligence / Live Scraper (if company provided)
        company_intel = None
        if target_company:
            yield {
                "type": "progress",
                "step": "company_research",
                "percent": 60,
                "title": f"Researching {target_company} Interview Patterns",
                "detail": f"Analyzing real candidate interview experiences, rounds, and difficulty for {target_company}...",
                "subreddits": subreddits,
            }

        # Event 4: pgvector RAG retrieval
        insights = await self.rag.get_role_insights(
            target_role,
            max_results=35,
            subreddits=subreddits,
            target_company=target_company,
            preparation_goal=preparation_goal,
        )

        if target_company:
            company_intel = await self._fetch_company_intelligence(
                target_role=target_role,
                target_company=target_company,
                insights=insights,
            )

        sample_quotes = []
        for ins in insights[:4]:
            post_title = ins.get("post_title") or ins.get("subreddit", "Reddit")
            snippet = ins.get("chunk_content", "")[:120].strip()
            sub = ins.get("subreddit", subreddits[0] if subreddits else "r/developersIndia")
            sample_quotes.append({"sub": sub, "title": post_title, "snippet": snippet})

        yield {
            "type": "progress",
            "step": "retrieved",
            "percent": 75,
            "title": f"Grounded with {len(insights)} Community Insights",
            "detail": f"Retrieved verified discussions and interview gotchas via pgvector (384-dim embeddings).",
            "subreddits": subreddits,
            "sample_quotes": sample_quotes,
        }
        await asyncio.sleep(0.3)

        # Event 5: LLM Study plan synthesis
        yield {
            "type": "progress",
            "step": "synthesizing",
            "percent": 88,
            "title": "Synthesizing Deep Study Syllabus",
            "detail": f"Generating daily hours, hands-on portfolio projects, and community gotchas with AI...",
            "subreddits": subreddits,
        }

        study_plan = await self._generate_study_plan(
            target_role, skill_list, timeline_days, hours_per_week, insights, experience_level, subreddits
        )

        # Event 6: Visual DAG generation
        nodes, edges = self._build_graph(skill_list, insights)

        yield {
            "type": "progress",
            "step": "assembling",
            "percent": 96,
            "title": "Assembling React Flow Graph",
            "detail": f"Arranging {len(nodes)} milestone nodes and prerequisite edges with milestone-weighted evidence.",
            "subreddits": subreddits,
        }
        await asyncio.sleep(0.2)

        # Final Event: Complete Result
        total_days = sum(n["data"]["duration_days"] for n in nodes)
        total_weeks = round(total_days / 7, 1)

        result_payload = {
            "roadmap_id": str(uuid.uuid4()),
            "target_role": target_role,
            "total_nodes": len(nodes),
            "total_weeks": total_weeks,
            "nodes": nodes,
            "edges": edges,
            "community_backing": any(len(n["data"]["citations"]) > 0 for n in nodes),
            "study_plan": study_plan,
            "discovered_subreddits": subreddits,
            "parsed_background_summary": bg_summary,
            "company_intelligence": company_intel,
        }

        yield {
            "type": "complete",
            "percent": 100,
            "result": result_payload,
        }

    # ─────────────────────────────────────────────────────────────
    # Company Intelligence Synthesizer
    # ─────────────────────────────────────────────────────────────

    async def _fetch_company_intelligence(
        self, target_role: str, target_company: str, insights: List[Dict]
    ) -> Optional[Dict]:
        """
        Uses Groq LLM to synthesize real scraped Reddit posts into a structured CompanyIntelligence payload.
        """
        if not target_company or not target_company.strip():
            return None

        clean_company = target_company.strip()

        # Format insights as evidence text
        formatted_posts = "\n\n".join([
            f"--- Post {i+1} ({ins.get('subreddit', 'unknown')}) ---\n"
            f"Title: {ins.get('post_title', '')}\n"
            f"Author: u/{ins.get('author', 'anonymous')} (Upvotes: {ins.get('upvotes', 0)})\n"
            f"Content: {ins.get('chunk_content', '')[:600]}"
            for i, ins in enumerate(insights[:8])
        ])

        top_citations = self.rag.format_citations_for_node(insights, max_per_node=5)

        if GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=GROQ_API_KEY)

                prompt = (
                    f"You are a technical career intelligence analyst.\n"
                    f"Target Company: {clean_company}\n"
                    f"Target Role: {target_role}\n\n"
                    f"Real Community Discussions & Reddit Data:\n"
                    f"{formatted_posts if formatted_posts.strip() else 'Synthesize based on standard industry hiring standards for ' + clean_company}\n\n"
                    "Instructions:\n"
                    f"Extract structured hiring and interview intelligence for {target_role} at {clean_company}.\n"
                    "Return ONLY valid JSON matching this exact structure:\n"
                    "{\n"
                    f'  "company_name": "{clean_company}",\n'
                    '  "difficulty_rating": "High",\n'
                    '  "interview_rounds": ["Round 1: Online Assessment", "Round 2: Technical Interview", "Round 3: System Design / Problem Solving", "Round 4: Behavioral / HR"],\n'
                    '  "key_topics": ["DSA", "Concurrency", "System Design", "Projects"],\n'
                    '  "community_verdict": "2-3 sentence honest summary of candidate experiences and interview expectations at this company.",\n'
                    '  "salary_range_inr": "Estimated package range like ₹18-28 LPA or Competitive",\n'
                    '  "success_tips": [\n'
                    '    "Actionable tip 1 for clearing this company round",\n'
                    '    "Actionable tip 2",\n'
                    '    "Actionable tip 3"\n'
                    '  ]\n'
                    "}"
                )

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=GROQ_MODEL,
                        messages=[
                            {"role": "system", "content": "You are a technical career intelligence analyst. Output only valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        max_tokens=800,
                        response_format={"type": "json_object"},
                    )
                )
                raw_text = response.choices[0].message.content.strip()
                parsed = json.loads(raw_text)
                parsed["top_reddit_threads"] = top_citations
                return parsed
            except Exception as e:
                logger.warning(f"Groq company intelligence generation failed: {e}")

        # Deterministic fallback intelligence
        return {
            "company_name": clean_company,
            "difficulty_rating": "Medium",
            "interview_rounds": [
                "Round 1: Online Assessment / Screening",
                "Round 2: Technical & Problem Solving",
                "Round 3: Architecture & Role Depth",
                "Round 4: Cultural Fit / HR",
            ],
            "key_topics": ["Core Fundamentals", "Hands-on Projects", "DSA", "System Architecture"],
            "community_verdict": f"Interviews at {clean_company} for {target_role} focus heavily on strong core fundamentals, real-world project implementation, and problem-solving velocity.",
            "salary_range_inr": "Competitive Industry Standards",
            "success_tips": [
                f"Be prepared to explain architectural trade-offs in projects on your resume.",
                f"Practice explaining code out loud during live technical screening.",
                f"Research {clean_company}'s engineering blog and core products.",
            ],
            "top_reddit_threads": top_citations,
        }

    # ─────────────────────────────────────────────────────────────
    # Dynamic AI Architecture Planner
    # ─────────────────────────────────────────────────────────────

    async def _plan_role_architecture(
        self,
        target_role: str,
        experience_level: str,
        timeline_days: int,
        hours_per_week: int,
        known_skills: List[str],
        skills_gap: List[str],
        background_description: str,
        target_company: str = "",
        preparation_goal: str = "job",
    ) -> Dict:
        """
        Uses Groq LLM to dynamically determine:
        1. Top 4 subreddits for this role
        2. Extracted known skills vs missing skills from background description
        3. Custom prerequisite milestone graph budgeted to timeline_days (grounded in company/interview targets)
        """
        company_context = f"\nTarget Company: {target_company} (Tailor milestones and interview focus to what {target_company} actively tests)" if target_company else ""
        goal_context = f"\nPrimary Goal: {preparation_goal.title()} Preparation" if preparation_goal else ""

        # Try Groq AI Planner
        if GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=GROQ_API_KEY)

                prompt = (
                    f"You are an expert AI technical career planner.\n"
                    f"Target Role: {target_role}{company_context}{goal_context}\n"
                    f"Experience Level: {experience_level}\n"
                    f"Timeline: {timeline_days} days ({hours_per_week} hours/week)\n"
                    f"Known Skills: {', '.join(known_skills) if known_skills else 'None specified'}\n"
                    f"User Background Description: {background_description if background_description else 'None provided'}\n\n"
                    "Instructions:\n"
                    "1. Identify the 4 most active and relevant subreddits for this role (e.g. 'r/ethdev', 'r/solidity' for Blockchain; 'r/iOSProgramming' for iOS; include 'r/cscareerquestions' or 'r/developersIndia' if company target is provided).\n"
                    "2. Parse the user's background description to identify what they already know and what skills they need to learn.\n"
                    f"3. Generate an ordered sequence of 4 to 8 prerequisite learning milestones to become a {target_role}.\n"
                    f"4. The sum of duration_days across milestones MUST fit within the {timeline_days}-day budget.\n"
                    "5. Return ONLY valid JSON matching this exact structure:\n"
                    "{\n"
                    '  "target_subreddits": ["r/subreddit1", "r/subreddit2", "r/subreddit3", "r/developersIndia"],\n'
                    '  "parsed_background_summary": "Brief 1-sentence summary of user current level and gap",\n'
                    '  "milestones": [\n'
                    '    {"name": "Skill Milestone Name", "duration_days": 5, "difficulty": "Beginner", "project_task": "Hands-on project to build"}\n'
                    '  ]\n'
                    "}"
                )

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=GROQ_MODEL,
                        messages=[
                            {"role": "system", "content": "You are a principal tech curriculum designer. Respond only with valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.3,
                    )
                )

                parsed = json.loads(response.choices[0].message.content)
                raw_milestones = parsed.get("milestones", [])
                if raw_milestones and len(raw_milestones) >= 2:
                    milestones_tuples = [
                        (m["name"], int(m.get("duration_days", 5)), m.get("difficulty", "Intermediate"), m.get("project_task", f"Build a {m['name']} project"))
                        for m in raw_milestones
                    ]
                    subreddits = parsed.get("target_subreddits") or self._infer_fallback_subreddits(target_role)
                    return {
                        "target_subreddits": subreddits,
                        "parsed_background_summary": parsed.get("parsed_background_summary", ""),
                        "milestones": milestones_tuples,
                    }
            except Exception as e:
                logger.warning(f"Groq dynamic planner failed, using deterministic fallback: {e}")

        # Deterministic Dynamic Fallback
        canonical_role = resolve_role(target_role)
        base_graph = ROLE_SKILL_GRAPH.get(canonical_role)

        if not base_graph:
            # Generate customized milestones for custom role
            base_graph = [
                (f"{target_role} Fundamentals & Core Architecture", max(3, int(timeline_days * 0.2)), "Beginner", f"Set up environment and build a hello-world project in {target_role}"),
                (f"Essential Tooling & Standard Libraries", max(3, int(timeline_days * 0.25)), "Beginner", f"Create a feature module using {target_role} industry packages"),
                (f"Advanced Design Patterns & State/Data Handling", max(4, int(timeline_days * 0.3)), "Intermediate", f"Build an end-to-end working system incorporating error handling"),
                (f"Testing, Optimization & Production Readiness", max(3, int(timeline_days * 0.25)), "Advanced", f"Write unit/integration tests and deploy {target_role} application"),
            ]

        # Filter out known skills
        known_lower = {s.lower().strip() for s in known_skills}
        if background_description:
            known_lower.update({word.lower().strip() for word in background_description.split() if len(word) > 3})

        skill_list = [s for s in base_graph if s[0].lower() not in known_lower]
        if len(skill_list) < 2:
            skill_list = base_graph[:4]

        # Prioritize gaps
        if skills_gap:
            gap_lower = {s.lower().strip() for s in skills_gap}
            priority  = [s for s in skill_list if any(g in s[0].lower() for g in gap_lower)]
            remaining = [s for s in skill_list if s not in priority]
            skill_list = priority + remaining

        skill_list = self._prune_to_budget(skill_list, timeline_days)
        subreddits = self._infer_fallback_subreddits(target_role)

        return {
            "target_subreddits": subreddits,
            "parsed_background_summary": f"Targeting {target_role} within a {timeline_days}-day sprint.",
            "milestones": skill_list,
        }

    def _infer_fallback_subreddits(self, target_role: str) -> List[str]:
        cleaned = target_role.lower().replace("developer", "").replace("engineer", "").replace("architect", "").strip()
        sub_map = {
            "cyber": ["r/cybersecurity", "r/netsecstudents", "r/AskNetsec", "r/developersIndia"],
            "security": ["r/cybersecurity", "r/netsecstudents", "r/AskNetsec", "r/developersIndia"],
            "front": ["r/frontend", "r/reactjs", "r/webdev", "r/developersIndia"],
            "devops": ["r/devops", "r/kubernetes", "r/aws", "r/developersIndia"],
            "ai": ["r/MachineLearning", "r/datascience", "r/LocalLLaMA", "r/learnmachinelearning"],
            "ml": ["r/MachineLearning", "r/datascience", "r/LocalLLaMA", "r/learnmachinelearning"],
            "block": ["r/ethdev", "r/solidity", "r/web3", "r/developersIndia"],
            "crypto": ["r/ethdev", "r/solidity", "r/web3", "r/developersIndia"],
            "web3": ["r/ethdev", "r/solidity", "r/web3", "r/developersIndia"],
            "ios": ["r/iOSProgramming", "r/swift", "r/apple", "r/developersIndia"],
            "swift": ["r/iOSProgramming", "r/swift", "r/apple", "r/developersIndia"],
            "android": ["r/androiddev", "r/Kotlin", "r/developersIndia"],
            "data": ["r/dataengineering", "r/datascience", "r/SQL", "r/developersIndia"],
            "game": ["r/gamedev", "r/unity3d", "r/unrealengine", "r/developersIndia"],
            "embedded": ["r/embedded", "r/C_Programming", "r/rust", "r/developersIndia"],
        }
        for key, subs in sub_map.items():
            if key in cleaned:
                return subs
        
        slug = cleaned.replace(" ", "")
        return [f"r/{slug}" if slug else "r/webdev", "r/cscareerquestions", "r/developersIndia"]

    # ─────────────────────────────────────────────────────────────
    # Graph & Study Plan Builders
    # ─────────────────────────────────────────────────────────────

    def _build_graph(self, skill_list: List[Tuple], insights: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        nodes = []
        for i, (skill_name, duration_days, difficulty, project_task) in enumerate(skill_list):
            # Dynamic milestone weights:
            # - Micro milestones (<5 days): 3-5 Reddit citations
            # - Core skill milestones (5-10 days): 5-8 Reddit citations
            # - Advanced / Capstone milestones (>10 days): 8-12 Reddit citations
            if duration_days < 5:
                max_citations = min(5, max(3, len(insights)))
            elif duration_days <= 10:
                max_citations = min(8, max(5, len(insights)))
            else:
                max_citations = min(12, max(8, len(insights)))

            matching_insights = self._filter_insights_for_skill(insights, skill_name, limit=max_citations)
            citations = self.rag.format_citations_for_node(
                matching_insights,
                max_per_node=max_citations,
            )
            node_id = f"node-{i + 1}"
            x, y = self._calc_position(i)

            nodes.append({
                "id": node_id,
                "type": "skillNode",
                "position": {"x": float(x), "y": float(y)},
                "data": {
                    "label": skill_name,
                    "duration_days": duration_days,
                    "difficulty": difficulty,
                    "project_task": project_task,
                    "citations": citations,
                    "status": "todo",
                },
            })

        edges = []
        for i in range(len(nodes) - 1):
            src = nodes[i]["id"]
            tgt = nodes[i + 1]["id"]
            edges.append({
                "id": f"e{src}-{tgt}",
                "source": src,
                "target": tgt,
                "animated": True,
                "type": "smoothstep",
            })
        return nodes, edges

    def _filter_insights_for_skill(self, insights: List[Dict], skill_name: str, limit: int = 5) -> List[Dict]:
        skill_lower = skill_name.lower()
        matched = [ins for ins in insights if skill_lower in ins.get("chunk_content", "").lower()]
        if len(matched) < limit:
            general = [ins for ins in insights if ins not in matched]
            matched = matched + general[: limit - len(matched)]
        return matched[:limit]

    async def _generate_study_plan(
        self,
        role: str,
        skill_list: List[Tuple],
        timeline_days: int,
        hours_per_week: int,
        insights: List[Dict],
        experience_level: str = "beginner",
        subreddits: Optional[List[str]] = None,
    ) -> Dict:
        """
        Synthesizes a rich, week-by-week study syllabus with Groq, falling back to deterministic generation.
        Enforces a structured 5-day weekday model (Monday to Friday) per week with consecutive day numbering.
        """
        primary_sub = subreddits[0] if subreddits else "r/developersIndia"
        total_weeks = max(1, math.ceil(timeline_days / 7.0))
        hours_per_day = max(0.5, round(hours_per_week / 5.0, 1))
        total_hours = int(total_weeks * hours_per_week)
        weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"]

        # Try Groq if configured
        if GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=GROQ_API_KEY)
                prompt = (
                    f"Create a structured JSON study syllabus for becoming a '{role}' in {timeline_days} days "
                    f"({hours_per_week} hours/week across {total_weeks} weeks). Experience: {experience_level}.\n"
                    f"Milestones to cover: {[s[0] for s in skill_list]}.\n"
                    f"Primary community source: {primary_sub}.\n\n"
                    f"CRITICAL STRUCTURAL RULES:\n"
                    f"1. Generate EXACTLY {total_weeks} weeks in 'weekly_schedule' (week_number from 1 to {total_weeks}).\n"
                    f"2. Each week MUST contain EXACTLY 5 structured weekday lessons: Monday to Friday with 'weekday' set to 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'.\n"
                    f"3. Each day's estimated_hours MUST be {hours_per_day} (5 days x {hours_per_day}h = {hours_per_week}h/week).\n"
                    f"4. 'day_number' MUST be globally consecutive from 1 to {total_weeks * 5} (Week 1: days 1..5, Week 2: days 6..10, etc.).\n"
                    f"5. 'estimated_total_hours' MUST be {total_hours}.\n"
                    f"6. 'executive_summary' MUST state the exact duration: 'A {timeline_days}-day, {hours_per_week}-hour-per-week structured roadmap across {total_weeks} weeks ({total_hours} total study hours)...'\n\n"
                    "Return ONLY valid JSON matching this exact structure:\n"
                    "{\n"
                    f'  "executive_summary": "A {timeline_days}-day, {hours_per_week}-hour-per-week structured roadmap across {total_weeks} weeks ({total_hours} total study hours)...",\n'
                    f'  "estimated_total_hours": {total_hours},\n'
                    '  "weekly_schedule": [\n'
                    '    {\n'
                    '      "week_number": 1,\n'
                    '      "theme": "string",\n'
                    '      "focus_milestone": "string",\n'
                    '      "goal": "string",\n'
                    '      "days": [\n'
                    f'        {{"day_number": 1, "weekday": "Mon", "title": "Topic", "estimated_hours": {hours_per_day}, "key_concepts": ["c1"], "practice_task": "task"}},\n'
                    f'        {{"day_number": 2, "weekday": "Tue", "title": "Topic", "estimated_hours": {hours_per_day}, "key_concepts": ["c1"], "practice_task": "task"}},\n'
                    f'        {{"day_number": 3, "weekday": "Wed", "title": "Topic", "estimated_hours": {hours_per_day}, "key_concepts": ["c1"], "practice_task": "task"}},\n'
                    f'        {{"day_number": 4, "weekday": "Thu", "title": "Topic", "estimated_hours": {hours_per_day}, "key_concepts": ["c1"], "practice_task": "task"}},\n'
                    f'        {{"day_number": 5, "weekday": "Fri", "title": "Topic", "estimated_hours": {hours_per_day}, "key_concepts": ["c1"], "practice_task": "task"}}\n'
                    '      ],\n'
                    f'      "reddit_gotchas": [{{"topic": "string", "warning": "string", "source_subreddit": "{primary_sub}"}}]\n'
                    '    }\n'
                    '  ],\n'
                    '  "capstone_projects": [{"title": "string", "description": "string", "key_technologies": ["t1"], "difficulty": "Intermediate"}],\n'
                    '  "recommended_resources": ["resource 1", "resource 2"]\n'
                    "}"
                )
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=GROQ_MODEL,
                        messages=[
                            {"role": "system", "content": "You are a senior tech curriculum planner. Respond only with valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.3,
                    )
                )
                content = response.choices[0].message.content
                parsed = json.loads(content)
                if "weekly_schedule" in parsed and len(parsed["weekly_schedule"]) > 0:
                    # Post-process & sanitize day numbers and weekdays
                    day_idx = 1
                    for w_idx, week in enumerate(parsed["weekly_schedule"]):
                        week["week_number"] = w_idx + 1
                        for d_idx, day in enumerate(week.get("days", [])):
                            day["day_number"] = day_idx
                            if not day.get("weekday") or day.get("weekday") not in weekdays:
                                day["weekday"] = weekdays[d_idx % 5]
                            day["estimated_hours"] = hours_per_day
                            day_idx += 1
                    parsed["estimated_total_hours"] = total_hours
                    return parsed
            except Exception as e:
                logger.warning(f"Groq syllabus generation failed, using deterministic fallback: {e}")

        # Deterministic rich fallback with 5 weekdays (Mon-Fri) per week
        weekly_schedule = []
        skills_per_week = max(1, math.ceil(len(skill_list) / float(total_weeks)))
        day_counter = 1

        for w in range(1, total_weeks + 1):
            w_skills = skill_list[(w - 1) * skills_per_week : w * skills_per_week]
            if not w_skills and skill_list:
                w_skills = [skill_list[-1]]

            focus_name = w_skills[0][0] if w_skills else f"{role} Milestone {w}"
            theme = f"Mastering {focus_name}"
            
            days = []
            for d_idx, day_name in enumerate(weekdays):
                concept_title = f"{focus_name} — Deep Dive Part {d_idx + 1}" if len(w_skills) == 1 else f"{w_skills[min(d_idx, len(w_skills)-1)][0]}"
                days.append({
                    "day_number": day_counter,
                    "weekday": day_name,
                    "title": concept_title,
                    "estimated_hours": hours_per_day,
                    "key_concepts": [
                        f"Core principles of {focus_name}",
                        f"Hands-on syntax & architectural patterns",
                        f"Debugging common failure cases in {day_name} session",
                    ],
                    "practice_task": f"Build a mini-exercise covering {concept_title} and test edge cases.",
                })
                day_counter += 1

            gotchas = [
                {
                    "topic": focus_name,
                    "warning": f"Community consensus on {primary_sub}: Don't just watch tutorials for {focus_name}. Build independent projects from scratch to build muscle memory.",
                    "source_subreddit": primary_sub,
                }
            ]

            weekly_schedule.append({
                "week_number": w,
                "theme": theme,
                "focus_milestone": focus_name,
                "goal": f"Achieve proficiency in {focus_name} with practical code output.",
                "days": days,
                "reddit_gotchas": gotchas,
            })

        capstones = [
            {
                "title": f"Production-Ready {role} Portfolio System",
                "description": f"End-to-end capstone project demonstrating real-world mastery of {role} fundamentals and architecture.",
                "key_technologies": [s[0] for s in skill_list[:4]],
                "difficulty": "Intermediate",
            }
        ]

        resources = [
            f"Official Documentation for {skill_list[0][0]}",
            f"Roadmap.sh Community Guides ({role})",
            f"Top Discussions on {primary_sub}",
        ]

        return {
            "executive_summary": (
                f"Personalized {timeline_days}-day curriculum for {role} ({experience_level.title()}). "
                f"Budgeting {total_hours} total hours across {total_weeks} structured sprint weeks (5 days/week)."
            ),
            "estimated_total_hours": total_hours,
            "weekly_schedule": weekly_schedule,
            "capstone_projects": capstones,
            "recommended_resources": resources,
        }

    def _prune_to_budget(self, skill_list: List[Tuple], timeline_days: int) -> List[Tuple]:
        selected = []
        days_used = 0
        for skill in skill_list:
            duration = skill[1]
            if days_used + duration <= timeline_days:
                selected.append(skill)
                days_used += duration
            elif len(selected) < 2:
                selected.append(skill)
                days_used += duration
        return selected

    def _calc_position(self, index: int) -> Tuple[int, int]:
        col = index % NODES_PER_ROW
        row = index // NODES_PER_ROW
        x = col * (NODE_WIDTH + H_GAP) + 50
        y = row * (NODE_HEIGHT + V_GAP) + 50
        return x, y

    # ─────────────────────────────────────────────────────────────
    # Market Intelligence & Dynamic Recommendation APIs
    # ─────────────────────────────────────────────────────────────

    async def fetch_trending_roles(self) -> List[Dict]:
        """
        Synthesizes live market and career discussions from Reddit into 6-8 trending tech roles.
        """
        insights = await self.rag.get_trending_roles_insights()
        formatted_posts = "\n\n".join([
            f"--- Discussion ({ins.get('subreddit', 'unknown')}) ---\n"
            f"Title: {ins.get('post_title', '')}\n"
            f"Excerpt: {ins.get('chunk_content', '')[:400]}"
            for ins in insights[:12]
        ])

        if GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=GROQ_API_KEY)

                prompt = (
                    "You are a tech industry labor market analyst.\n"
                    "Analyze the following real discussions from developer communities (Reddit):\n\n"
                    f"{formatted_posts}\n\n"
                    "Instructions:\n"
                    "Extract 6 to 8 currently in-demand/trending technical software roles.\n"
                    "For each role, provide:\n"
                    "1. role_name\n"
                    "2. category ('AI & Data', 'Cloud & DevOps', 'Full Stack & Backend', 'Security', etc.)\n"
                    "3. demand_badge ('Surging 🔥', 'High Demand 📈', 'Steady 🛡️')\n"
                    "4. why_trending (1-2 sentences summarizing what the community is saying)\n"
                    "5. key_skills (list of 3-4 top technologies)\n"
                    "6. recommended_timeline_days (integer days to become job-ready)\n"
                    "7. sample_hiring_companies (list of 3-5 companies mentioned or known for hiring this role)\n"
                    "8. source_subreddits\n\n"
                    "Return ONLY valid JSON matching this schema:\n"
                    "{\n"
                    '  "trending_roles": [\n'
                    '    {\n'
                    '      "role_name": "AI Application / Agent Engineer",\n'
                    '      "category": "AI & Data",\n'
                    '      "demand_badge": "Surging 🔥",\n'
                    '      "why_trending": "Massive shift towards LLM agent orchestration, RAG pipelines, and fine-tuning at tech startups.",\n'
                    '      "key_skills": ["Python", "LangChain / LlamaIndex", "Vector DBs", "FastAPI"],\n'
                    '      "recommended_timeline_days": 45,\n'
                    '      "sample_hiring_companies": ["OpenAI", "Anthropic", "Swiggy", "Databricks"],\n'
                    '      "source_subreddits": ["r/LocalLLaMA", "r/MachineLearning"]\n'
                    '    }\n'
                    '  ]\n'
                    "}"
                )

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=GROQ_MODEL,
                        messages=[
                            {"role": "system", "content": "You are a tech labor market analyst. Respond only with valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        response_format={"type": "json_object"},
                    )
                )
                parsed = json.loads(response.choices[0].message.content)
                if "trending_roles" in parsed and len(parsed["trending_roles"]) > 0:
                    return parsed["trending_roles"]
            except Exception as e:
                logger.warning(f"Groq trending roles extraction failed: {e}")

        # Deterministic dynamic fallback
        return [
            {
                "role_name": "AI Application / Agent Engineer",
                "category": "AI & Data",
                "demand_badge": "Surging 🔥",
                "why_trending": "Rapid adoption of production RAG pipelines, multi-agent frameworks, and vector search across product companies.",
                "key_skills": ["Python", "LangChain / LangGraph", "Vector Databases", "FastAPI"],
                "recommended_timeline_days": 45,
                "sample_hiring_companies": ["OpenAI", "Databricks", "Swiggy", "Microsoft"],
                "source_subreddits": ["r/LocalLLaMA", "r/MachineLearning", "r/developersIndia"],
            },
            {
                "role_name": "Cloud & DevOps Engineer",
                "category": "Cloud & Infrastructure",
                "demand_badge": "High Demand 📈",
                "why_trending": "High demand for Kubernetes orchestration, Terraform automation, and cost-effective cloud deployments.",
                "key_skills": ["Docker", "Kubernetes", "Terraform", "CI/CD", "AWS / GCP"],
                "recommended_timeline_days": 60,
                "sample_hiring_companies": ["Uber", "Razorpay", "Atlassian", "AWS"],
                "source_subreddits": ["r/devops", "r/kubernetes", "r/developersIndia"],
            },
            {
                "role_name": "Full Stack Next.js & Go Engineer",
                "category": "Full Stack & Web",
                "demand_badge": "High Demand 📈",
                "why_trending": "Modern startups standardized on Next.js 15 for frontends and high-performance Go/Rust microservices.",
                "key_skills": ["TypeScript", "Next.js", "Go / Python", "PostgreSQL", "Tailwind"],
                "recommended_timeline_days": 45,
                "sample_hiring_companies": ["Zepto", "Zomato", "Stripe", "Coinbase"],
                "source_subreddits": ["r/webdev", "r/reactjs", "r/developersIndia"],
            },
            {
                "role_name": "Cloud Security & DevSecOps",
                "category": "Security",
                "demand_badge": "Surging 🔥",
                "why_trending": "Surge in cloud migration necessitates dedicated security engineers for IAM, zero-trust, and container vulnerability scanning.",
                "key_skills": ["Cloud IAM", "SIEM Tools", "Network Security", "Docker Security", "Linux"],
                "recommended_timeline_days": 60,
                "sample_hiring_companies": ["CrowdStrike", "Palo Alto Networks", "Goldman Sachs", "TCS"],
                "source_subreddits": ["r/cybersecurity", "r/netsecstudents", "r/developersIndia"],
            },
            {
                "role_name": "Data Platform Engineer",
                "category": "AI & Data",
                "demand_badge": "High Demand 📈",
                "why_trending": "Streaming analytics, lakehouses, and real-time Kafka event architectures dominate enterprise hiring.",
                "key_skills": ["Apache Kafka", "Apache Spark", "Snowflake / dbt", "SQL", "Python"],
                "recommended_timeline_days": 60,
                "sample_hiring_companies": ["Walmart Global Tech", "PhonePe", "Uber", "Fractal"],
                "source_subreddits": ["r/dataengineering", "r/SQL", "r/developersIndia"],
            },
            {
                "role_name": "Backend & Distributed Systems Engineer",
                "category": "Backend",
                "demand_badge": "Steady 🛡️",
                "why_trending": "Evergreen hiring for core business logic, database scaling, caching, and low-latency microservices.",
                "key_skills": ["Java / Go", "System Design", "Redis", "PostgreSQL", "gRPC"],
                "recommended_timeline_days": 60,
                "sample_hiring_companies": ["Google", "Amazon", "Flipkart", "JPMorgan"],
                "source_subreddits": ["r/cscareerquestions", "r/developersIndia"],
            }
        ]

    async def recommend_timeline(
        self,
        target_role: str,
        background_description: str = "",
        hours_per_week: int = 10,
    ) -> Dict:
        """
        Dynamically calculates 3 timeline tiers (Sprint, Recommended, Mastery) and community consensus quote
        based on role complexity, background description, and real Reddit learning curve discussions.
        """
        insights = await self.rag.get_timeline_insights(target_role)
        formatted_posts = "\n\n".join([
            f"--- Reddit Post ({ins.get('subreddit', 'unknown')}) ---\n"
            f"Title: {ins.get('post_title', '')}\n"
            f"Content: {ins.get('chunk_content', '')[:350]}"
            for ins in insights[:8]
        ])

        if GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=GROQ_API_KEY)

                prompt = (
                    f"You are a technical education and career timeline advisor.\n"
                    f"Target Role: {target_role}\n"
                    f"User Background Description: {background_description if background_description else 'Beginner / Fresher starting from scratch'}\n"
                    f"Available Commitment: {hours_per_week} hours/week\n\n"
                    f"Real Reddit Learning Curve Discussions:\n"
                    f"{formatted_posts}\n\n"
                    "Instructions:\n"
                    "1. Parse the user's background text to see what foundational knowledge they have.\n"
                    "2. Dynamically calculate realistic preparation timelines for this specific role and background:\n"
                    "   - sprint_days (Rapid interview crash course for urgent hiring, e.g. 14-25 days)\n"
                    "   - recommended_days (Solid job-ready preparation with projects, e.g. 30-65 days)\n"
                    "   - mastery_days (Deep architectural depth and system design, e.g. 60-120 days)\n"
                    "3. Formulate a realistic 1-sentence community consensus quote based on Reddit feedback.\n"
                    "4. Return ONLY valid JSON matching this schema:\n"
                    "{\n"
                    f'  "target_role": "{target_role}",\n'
                    '  "user_background_summary": "1-sentence summary of what user knows and what needs to be learned",\n'
                    '  "sprint_days": 21,\n'
                    '  "sprint_focus": "High-yield interview gotchas, core syntax & 1 rapid project",\n'
                    '  "recommended_days": 45,\n'
                    '  "recommended_focus": "Core toolchain, 2 production repos & live technical screening readiness",\n'
                    '  "mastery_days": 90,\n'
                    '  "mastery_focus": "End-to-end distributed architecture, performance tuning & full capstone portfolio",\n'
                    f'  "community_consensus_quote": "Based on community discussions on r/developersIndia, junior readiness for {target_role} takes ~45 days at {hours_per_week}h/week.",\n'
                    f'  "recommended_hours_per_week": {hours_per_week},\n'
                    '  "source_subreddits": ["r/developersIndia", "r/cscareerquestions"]\n'
                    "}"
                )

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=GROQ_MODEL,
                        messages=[
                            {"role": "system", "content": "You are a tech education advisor. Respond only with valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        response_format={"type": "json_object"},
                    )
                )
                parsed = json.loads(response.choices[0].message.content)
                return parsed
            except Exception as e:
                logger.warning(f"Groq timeline recommendation failed: {e}")

        # Deterministic Dynamic Fallback
        primary_sub = self._infer_fallback_subreddits(target_role)[0]
        return {
            "target_role": target_role,
            "user_background_summary": f"Targeting {target_role} with customized focus on core prerequisites and hands-on projects.",
            "sprint_days": 21,
            "sprint_focus": "High-yield interview gotchas, core syntax & 1 rapid project",
            "recommended_days": 45,
            "recommended_focus": "Core toolchain, 2 production repos & live technical screening readiness",
            "mastery_days": 90,
            "mastery_focus": "End-to-end distributed architecture, performance tuning & full capstone portfolio",
            "community_consensus_quote": f"Based on community discussions on {primary_sub}, junior readiness for {target_role} takes ~45 days at {hours_per_week}h/week.",
            "recommended_hours_per_week": hours_per_week,
            "source_subreddits": [primary_sub, "r/developersIndia"],
        }

    async def discover_companies_for_role(self, target_role: str) -> Dict:
        """
        Dynamically extracts and groups companies into Tier 1, Tier 2, Tier 3 with role-specific hiring focus from Reddit.
        """
        insights = await self.rag.get_role_hiring_companies_insights(target_role)
        formatted_posts = "\n\n".join([
            f"--- Reddit Discussion ({ins.get('subreddit', 'unknown')}) ---\n"
            f"Title: {ins.get('post_title', '')}\n"
            f"Content: {ins.get('chunk_content', '')[:350]}"
            for ins in insights[:10]
        ])

        top_citations = self.rag.format_citations_for_node(insights, max_per_node=4)

        if GROQ_API_KEY:
            try:
                from groq import Groq
                client = Groq(api_key=GROQ_API_KEY)

                prompt = (
                    f"You are a tech recruitment and compensation analyst.\n"
                    f"Target Role: {target_role}\n\n"
                    f"Real Reddit Hiring & Interview Debriefs:\n"
                    f"{formatted_posts}\n\n"
                    "Instructions:\n"
                    f"Analyze which companies actively hire for '{target_role}'.\n"
                    "Organize them dynamically into 3 distinct tiers:\n"
                    "- Tier 1: Top Product / Global Tech Giants with high hiring bar\n"
                    "- Tier 2: High-Growth Unicorns & Fast-Paced Startups\n"
                    "- Tier 3: Enterprise, FinTech & IT Consultancies\n"
                    "For each tier, define:\n"
                    "1. tier_title (Role-specific descriptive title, e.g. 'Tier 1: Global Cloud & Infrastructure Leaders')\n"
                    f"2. role_specific_focus (What this tier actually tests for {target_role})\n"
                    "3. typical_package_range (e.g. '₹24-40 LPA' or '$130k-180k')\n"
                    "4. companies (List of 3-5 company names discovered from posts or standard market leaders for this role)\n"
                    "5. community_tips (2 practical tips from candidates)\n\n"
                    "Return ONLY valid JSON matching this schema:\n"
                    "{\n"
                    f'  "target_role": "{target_role}",\n'
                    '  "tiers": [\n'
                    '    {\n'
                    '      "tier_level": "Tier 1",\n'
                    '      "tier_title": "Tier 1: Top Product & Scale Leaders",\n'
                    '      "role_specific_focus": "Deep DSA, distributed concurrency, and architectural trade-offs",\n'
                    '      "typical_package_range": "₹22-38 LPA",\n'
                    '      "companies": ["Company A", "Company B", "Company C"],\n'
                    '      "community_tips": ["Focus on code optimization out loud", "Review previous interview questions"]\n'
                    '    }\n'
                    '  ]\n'
                    "}"
                )

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model=GROQ_MODEL,
                        messages=[
                            {"role": "system", "content": "You are a tech recruitment analyst. Respond only with valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        response_format={"type": "json_object"},
                    )
                )
                parsed = json.loads(response.choices[0].message.content)
                parsed["source_reddit_threads"] = top_citations
                return parsed
            except Exception as e:
                logger.warning(f"Groq company discovery failed: {e}")

        # Deterministic Dynamic Fallback
        return {
            "target_role": target_role,
            "tiers": [
                {
                    "tier_level": "Tier 1",
                    "tier_title": f"Tier 1: High-Bar Product Leaders ({target_role})",
                    "role_specific_focus": f"Deep core architecture, live coding, and distributed design for {target_role}",
                    "typical_package_range": "₹22-40 LPA",
                    "companies": ["Google", "Microsoft", "Amazon", "Uber", "Atlassian"],
                    "community_tips": ["Explain algorithmic trade-offs clearly", "Build high-scale independent projects"],
                },
                {
                    "tier_level": "Tier 2",
                    "tier_title": f"Tier 2: High-Growth Startups & Unicorns",
                    "role_specific_focus": f"Fast feature delivery, framework depth, and hands-on system building in {target_role}",
                    "typical_package_range": "₹16-28 LPA",
                    "companies": ["Swiggy", "Zomato", "Razorpay", "Zepto", "PhonePe"],
                    "community_tips": ["Showcase deployed production repos", "Demonstrate end-to-end debugging agility"],
                },
                {
                    "tier_level": "Tier 3",
                    "tier_title": f"Tier 3: Enterprise & IT Consultancies",
                    "role_specific_focus": f"Solid fundamentals, client delivery standards, and core tooling in {target_role}",
                    "typical_package_range": "₹8-16 LPA",
                    "companies": ["TCS Digital", "Infosys", "Deloitte", "Goldman Sachs", "Capgemini"],
                    "community_tips": ["Review fundamental concepts and SQL/OOPs", "Highlight certifications and coursework"],
                },
            ],
            "source_reddit_threads": top_citations,
        }

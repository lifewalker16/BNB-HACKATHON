"""
Roadmap routes — public endpoints with real-time SSE streaming.
"""

import json
import logging
import uuid
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from backend.models.schemas import (
    RoadmapRequest,
    RoadmapResponse,
    FlowNode,
    FlowEdge,
    StudyPlan,
    TrendingRolesResponse,
    TrendingRole,
    TimelineRecommendationRequest,
    DynamicTimelineRecommendation,
    RoleCompanyDiscoveryResponse,
)
from backend.database.supabase_db import save_roadmap, get_roadmap

logger = logging.getLogger("radardev.routes_roadmap")

router_roadmap = APIRouter(prefix="/api/v1/roadmap", tags=["Roadmap"])


@router_roadmap.get("/trending-roles", response_model=TrendingRolesResponse)
async def get_trending_roles(request: Request):
    """
    Returns 6-8 trending technical software roles extracted dynamically from live developer communities.
    """
    embedder = request.app.state.embedder
    try:
        from backend.services.roadmap_engine import RoadmapEngine
        engine = RoadmapEngine(embedder)
        roles = await engine.fetch_trending_roles()
        return TrendingRolesResponse(
            trending_roles=[TrendingRole(**r) for r in roles]
        )
    except Exception as exc:
        logger.error(f"Failed to fetch trending roles: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router_roadmap.post("/recommend-timeline", response_model=DynamicTimelineRecommendation)
async def recommend_timeline(request_body: TimelineRecommendationRequest, request: Request):
    """
    Dynamically estimates Sprint, Recommended, and Mastery timelines based on role & background text.
    """
    embedder = request.app.state.embedder
    try:
        from backend.services.roadmap_engine import RoadmapEngine
        engine = RoadmapEngine(embedder)
        result = await engine.recommend_timeline(
            target_role=request_body.target_role,
            background_description=request_body.background_description,
            hours_per_week=request_body.hours_per_week,
        )
        return DynamicTimelineRecommendation(**result)
    except Exception as exc:
        logger.error(f"Failed to recommend timeline: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router_roadmap.get("/hiring-companies", response_model=RoleCompanyDiscoveryResponse)
async def get_hiring_companies(role: str, request: Request):
    """
    Returns companies dynamically grouped into Tier 1, Tier 2, Tier 3 with role-specific hiring focus from Reddit.
    """
    embedder = request.app.state.embedder
    try:
        from backend.services.roadmap_engine import RoadmapEngine
        engine = RoadmapEngine(embedder)
        result = await engine.discover_companies_for_role(target_role=role)
        return RoleCompanyDiscoveryResponse(**result)
    except Exception as exc:
        logger.error(f"Failed to discover hiring companies: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router_roadmap.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(request_body: RoadmapRequest, request: Request):
    """
    Generate an adaptive, time-budgeted React Flow roadmap with comprehensive study syllabus.
    """
    embedder = request.app.state.embedder

    try:
        from backend.services.roadmap_engine import RoadmapEngine
        engine = RoadmapEngine(embedder)

        nodes_raw, edges_raw, study_plan_raw, subreddits, bg_summary, company_intel = await engine.generate(
            target_role=request_body.target_role,
            experience_level=request_body.experience_level,
            timeline_days=request_body.timeline_days,
            hours_per_week=request_body.hours_per_week,
            known_skills=request_body.known_skills,
            skills_gap=request_body.skills_gap,
            background_description=request_body.background_description,
            target_company=request_body.target_company,
            preparation_goal=request_body.preparation_goal,
        )
    except Exception as exc:
        logger.error(f"Roadmap generation failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {exc}")

    try:
        nodes = [FlowNode(**n) for n in nodes_raw]
        edges = [FlowEdge(**e) for e in edges_raw]
        study_plan = StudyPlan(**study_plan_raw) if study_plan_raw else None
    except Exception as exc:
        logger.error(f"Response serialization failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Response serialization failed: {exc}")

    total_days = sum(n.data.duration_days for n in nodes)
    total_weeks = round(total_days / 7, 1)
    has_community = any(len(n.data.citations) > 0 for n in nodes)

    # Persist the roadmap (non-blocking)
    roadmap_id = str(uuid.uuid4())
    try:
        saved_id = await save_roadmap(
            user_id="anonymous",
            target_role=request_body.target_role,
            timeline_days=request_body.timeline_days,
            hours_per_week=request_body.hours_per_week,
            experience_level=request_body.experience_level,
            skills_gap=request_body.skills_gap,
            nodes=[n.model_dump() for n in nodes],
            edges=[e.model_dump() for e in edges],
        )
        if saved_id:
            roadmap_id = saved_id
    except Exception as exc:
        logger.warning(f"Roadmap persistence failed (non-blocking): {exc}")

    return RoadmapResponse(
        roadmap_id=roadmap_id,
        target_role=request_body.target_role,
        total_nodes=len(nodes),
        total_weeks=total_weeks,
        nodes=nodes,
        edges=edges,
        community_backing=has_community,
        study_plan=study_plan,
        discovered_subreddits=subreddits,
        parsed_background_summary=bg_summary,
        company_intelligence=company_intel,
    )


@router_roadmap.post("/generate-stream")
async def generate_roadmap_stream(request_body: RoadmapRequest, request: Request):
    """
    SSE stream endpoint that emits real-time Deep Research logs,
    scanned subreddits, community quotes, and finally the complete roadmap + study syllabus.
    """
    embedder = request.app.state.embedder

    async def event_generator():
        try:
            from backend.services.roadmap_engine import RoadmapEngine
            engine = RoadmapEngine(embedder)

            async for event in engine.generate_stream(
                target_role=request_body.target_role,
                experience_level=request_body.experience_level,
                timeline_days=request_body.timeline_days,
                hours_per_week=request_body.hours_per_week,
                known_skills=request_body.known_skills,
                skills_gap=request_body.skills_gap,
                background_description=request_body.background_description,
                target_company=request_body.target_company,
                preparation_goal=request_body.preparation_goal,
            ):
                # Format as Server-Sent Event (SSE)
                payload = json.dumps(event)
                yield f"data: {payload}\n\n"

        except Exception as exc:
            logger.error(f"Streaming roadmap failed: {exc}")
            err_payload = json.dumps({"type": "error", "message": str(exc)})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router_roadmap.get("/{roadmap_id}", response_model=RoadmapResponse)
async def get_saved_roadmap(roadmap_id: str):
    """Fetch a previously saved roadmap by its UUID."""
    try:
        data = await get_roadmap(roadmap_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    if not data:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    nodes = [FlowNode(**n) for n in (data.get("nodes") or [])]
    edges = [FlowEdge(**e) for e in (data.get("edges") or [])]
    study_plan = StudyPlan(**data["study_plan"]) if data.get("study_plan") else None
    total_days = sum(n.data.duration_days for n in nodes)

    return RoadmapResponse(
        roadmap_id=roadmap_id,
        target_role=data.get("target_role", ""),
        total_nodes=len(nodes),
        total_weeks=round(total_days / 7, 1),
        nodes=nodes,
        edges=edges,
        community_backing=any(len(n.data.citations) > 0 for n in nodes),
        study_plan=study_plan,
        discovered_subreddits=data.get("discovered_subreddits", []),
        parsed_background_summary=data.get("parsed_background_summary"),
    )

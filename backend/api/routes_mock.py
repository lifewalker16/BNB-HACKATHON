"""
Mock interview routes — public endpoints (no authentication required for MVP).
"""

import logging
from fastapi import APIRouter, HTTPException, Request

from backend.models.schemas import (
    MockQuestionsRequest,
    MockQuestionsResponse,
    MockQuestion,
    MockEvaluateRequest,
    MockEvaluateResponse,
    RoadmapResponse,
    FlowNode,
    FlowEdge,
)

logger = logging.getLogger("radardev.routes_mock")

router_mock = APIRouter(prefix="/api/v1/mock", tags=["Mock Interview"])


@router_mock.post("/questions", response_model=MockQuestionsResponse)
async def get_mock_questions(request_body: MockQuestionsRequest, request: Request):
    """
    Generate 5 interview questions for a specific roadmap milestone.
    Results are cached per milestone_label+difficulty+syllabus — repeated calls are instant.
    """
    embedder = request.app.state.embedder

    try:
        from backend.services.mock_engine import MockEngine
        engine = MockEngine(embedder)
        questions_raw = engine.generate_questions(
            milestone_label=request_body.milestone_label,
            difficulty=request_body.difficulty,
            target_role=request_body.target_role,
            syllabus_context=request_body.syllabus_context,
        )
    except Exception as exc:
        logger.error(f"Question generation failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Question generation failed: {exc}")

    questions = [
        MockQuestion(
            id=q["id"],
            text=q["text"],
            type=q.get("type", "conceptual"),
            tested_concept=q.get("tested_concept"),
            difficulty=request_body.difficulty,
        )
        for q in questions_raw
    ]

    return MockQuestionsResponse(
        milestone_label=request_body.milestone_label,
        questions=questions,
    )


@router_mock.post("/evaluate", response_model=MockEvaluateResponse)
async def evaluate_mock_answers(request_body: MockEvaluateRequest, request: Request):
    """
    Evaluate user's answers to mock questions.
    Returns comprehensive diagnostic report, readiness score, weaknesses, and a 3-day remedial roadmap.
    """
    embedder = request.app.state.embedder

    try:
        from backend.services.mock_engine import MockEngine
        engine = MockEngine(embedder)

        answers_dicts = [
            {"question_id": a.question_id, "answer": a.answer}
            for a in request_body.answers
        ]

        eval_result = engine.evaluate_answers(
            milestone_label=request_body.milestone_label,
            difficulty=request_body.difficulty or "Beginner",
            answers=answers_dicts,
            target_role=request_body.target_role,
            syllabus_context=request_body.syllabus_context,
        )
    except Exception as exc:
        logger.error(f"Answer evaluation failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {exc}")

    # Build remedial roadmap if there are weaknesses
    remedial_response = None
    if eval_result.get("identified_weaknesses") and eval_result["readiness_score"] < 70:
        try:
            remedial_raw = await engine.build_remedial_roadmap(
                weaknesses=eval_result["identified_weaknesses"],
                target_role=request_body.milestone_label,
                embedder=embedder,
            )
            if remedial_raw:
                nodes = [FlowNode(**n) for n in remedial_raw["nodes"]]
                edges = [FlowEdge(**e) for e in remedial_raw["edges"]]
                total_days = sum(n.data.duration_days for n in nodes)
                remedial_response = RoadmapResponse(
                    roadmap_id="remedial",
                    target_role=f"Remedial: {request_body.milestone_label}",
                    total_nodes=len(nodes),
                    total_weeks=round(total_days / 7, 1),
                    nodes=nodes,
                    edges=edges,
                    community_backing=False,
                    study_plan=remedial_raw.get("study_plan"),
                )
        except Exception as exc:
            logger.warning(f"Remedial roadmap generation failed (non-blocking): {exc}")

    return MockEvaluateResponse(
        readiness_score=eval_result["readiness_score"],
        overall_verdict=eval_result["overall_verdict"],
        identified_weaknesses=eval_result.get("identified_weaknesses", []),
        remedial_roadmap=remedial_response,
        executive_summary=eval_result.get("executive_summary"),
        category_scores=eval_result.get("category_scores", {}),
        detailed_questions=eval_result.get("detailed_questions", []),
        action_checklist=eval_result.get("action_checklist", []),
        strengths=eval_result.get("strengths", []),
        critical_gaps=eval_result.get("critical_gaps", []),
    )

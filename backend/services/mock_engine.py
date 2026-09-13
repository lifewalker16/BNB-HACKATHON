"""
Mock Interview Engine — AI-powered milestone readiness assessment.

Flow:
  1. generate_questions(milestone_label, difficulty, syllabus_context) → 5 syllabus-grounded questions via Groq
  2. evaluate_answers(milestone_label, answers, syllabus_context) → readiness_score + category breakdowns + detailed per-question critique + action checklist + remedial roadmap
  
Groq model: llama-3.3-70b-versatile (fallback to sentence embedding similarity)
"""

import json
import logging
import re
import uuid
from typing import List, Dict, Optional, Tuple

from groq import Groq
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from backend.core.config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger("radardev.mock_engine")

# Groq client (module-level singleton)
_groq_client: Optional[Groq] = None

def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client


class MockEngine:
    def __init__(self, embedder: SentenceTransformer):
        self.embedder = embedder
        self._question_cache: Dict[str, List[Dict]] = {}

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    def generate_questions(
        self,
        milestone_label: str,
        difficulty: str = "Beginner",
        target_role: Optional[str] = None,
        syllabus_context: Optional[str] = None,
    ) -> List[Dict]:
        """
        Returns 5 interview questions grounded in the milestone and weekly study plan.
        Results are cached by (milestone_label, difficulty, syllabus_hash).
        Each question: {"id": str, "text": str, "type": str, "tested_concept": str, "ideal_answer": str}
        """
        ctx_hash = hash(syllabus_context.strip()) if syllabus_context else 0
        cache_key = f"{milestone_label}::{difficulty}::{ctx_hash}"
        if cache_key in self._question_cache:
            logger.info(f"Question cache HIT for '{milestone_label}'")
            return self._question_cache[cache_key]

        prompt = self._build_question_prompt(
            milestone=milestone_label,
            difficulty=difficulty,
            target_role=target_role,
            syllabus_context=syllabus_context,
        )
        raw = self._call_groq(prompt)
        questions = self._parse_questions(raw, milestone_label)
        self._question_cache[cache_key] = questions
        return questions

    def evaluate_answers(
        self,
        milestone_label: str,
        difficulty: str,
        answers: List[Dict],    # [{"question_id": str, "answer": str}]
        target_role: Optional[str] = None,
        syllabus_context: Optional[str] = None,
    ) -> Dict:
        """
        Scores each answer and returns a complete diagnostic report matching the ATS resume analyzer:
        {
          "readiness_score": float (0-100),
          "overall_verdict": str,
          "executive_summary": str,
          "category_scores": Dict[str, float],
          "identified_weaknesses": List[str],
          "strengths": List[str],
          "critical_gaps": List[str],
          "detailed_questions": List[Dict],
          "action_checklist": List[Dict],
        }
        """
        questions = self.generate_questions(
            milestone_label=milestone_label,
            difficulty=difficulty,
            target_role=target_role,
            syllabus_context=syllabus_context,
        )
        q_map = {q["id"]: q for q in questions}

        # Attempt structured LLM evaluation via Groq
        llm_eval = self._evaluate_with_llm(
            milestone_label=milestone_label,
            difficulty=difficulty,
            questions=questions,
            answers=answers,
            syllabus_context=syllabus_context,
        )

        if llm_eval:
            return llm_eval

        # Fallback to local SentenceTransformer embedding evaluation
        logger.warning("Falling back to local embedding evaluation for mock answers")
        return self._evaluate_with_embeddings(
            milestone_label=milestone_label,
            questions=questions,
            answers=answers,
            q_map=q_map,
        )

    async def build_remedial_roadmap(
        self,
        weaknesses: List[str],
        target_role: str,
        embedder: SentenceTransformer,
    ) -> Optional[Dict]:
        """
        Returns a short 3-day remedial roadmap as (nodes, edges) focused on weaknesses.
        Delegates to RoadmapEngine with a 3-day timeline and weaknesses as skills_gap.
        """
        if not weaknesses:
            return None

        from backend.services.roadmap_engine import RoadmapEngine
        engine = RoadmapEngine(embedder)
        nodes, edges, study_plan, *rest = await engine.generate(
            target_role=target_role,
            experience_level="beginner",
            timeline_days=3,
            skills_gap=weaknesses,
        )
        return {"nodes": nodes, "edges": edges, "study_plan": study_plan}

    # ─────────────────────────────────────────────────────────────
    # Private helpers — Question Generation
    # ─────────────────────────────────────────────────────────────

    def _build_question_prompt(
        self,
        milestone: str,
        difficulty: str,
        target_role: Optional[str] = None,
        syllabus_context: Optional[str] = None,
    ) -> str:
        role_str = f" for the role of '{target_role}'" if target_role else ""
        syllabus_instruction = ""
        if syllabus_context and syllabus_context.strip():
            syllabus_instruction = f"""
IMPORTANT: The candidate just completed studying the following weekly syllabus:
\"\"\"{syllabus_context.strip()}\"\"\"

Generate questions that specifically test the tools, daily concepts, and practical tasks mentioned in this syllabus.
"""

        return f"""You are a Principal Tech Lead and Senior Technical Interviewer assessing a candidate{role_str} on "{milestone}" at the {difficulty} level.
{syllabus_instruction}
Generate exactly 5 high-yield interview questions:
- Question 1 (conceptual): Fundamental principles, core architecture, or theory.
- Question 2 (conceptual/practical): Key trade-offs, internal mechanics, or comparison.
- Question 3 (practical): Code syntax, command execution, or step-by-step implementation.
- Question 4 (debugging/scenario): Error logs, edge case handling, or troubleshooting.
- Question 5 (scenario/architecture): Real-world production decision, performance, or security gotcha.

For each question, provide:
1. "id": "q1" through "q5"
2. "text": Clear, specific interview question
3. "type": "conceptual" | "practical" | "debugging" | "scenario"
4. "tested_concept": Short label of the specific skill/topic tested (e.g. "Reentrancy Protection", "Docker Layer Caching")
5. "ideal_answer": Concise, gold-standard benchmark answer (2-4 sentences explaining what an ideal senior candidate says)

Return ONLY a valid JSON array matching this exact format:
[
  {{
    "id": "q1",
    "text": "Question text here",
    "type": "conceptual",
    "tested_concept": "Core Architecture",
    "ideal_answer": "The gold standard explanation here"
  }}
]

Do NOT include markdown backticks or commentary outside the JSON array."""

    def _call_groq(self, prompt: str, max_tokens: int = 2000) -> str:
        """Call Groq API with retry on JSON parse failure."""
        groq = _get_groq()
        for attempt in range(2):
            try:
                response = groq.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                    max_tokens=max_tokens,
                )
                raw = response.choices[0].message.content or ""
                raw = re.sub(r"^```(?:json)?", "", raw.strip(), flags=re.MULTILINE)
                raw = re.sub(r"```$", "", raw.strip(), flags=re.MULTILINE)
                raw = (
                    raw.replace('“', '"')
                    .replace('”', '"')
                    .replace('’', "'")
                    .replace('‘', "'")
                    .replace('—', '-')
                    .replace('–', '-')
                    .replace('\u2011', '-')
                )
                return raw.strip()
            except Exception as exc:
                logger.warning(f"Groq call attempt {attempt + 1} failed: {exc}")
        return "[]"

    def _parse_questions(self, raw: str, milestone_label: str) -> List[Dict]:
        """Parse Groq response into a list of question dicts."""
        try:
            questions = json.loads(raw)
            if isinstance(questions, list) and len(questions) > 0:
                for i, q in enumerate(questions):
                    q.setdefault("id", f"q{i + 1}")
                    q.setdefault("type", "conceptual")
                    q.setdefault("tested_concept", f"{milestone_label} Concept {i + 1}")
                    q.setdefault("ideal_answer", "")
                return questions[:5]
        except (json.JSONDecodeError, TypeError) as exc:
            logger.warning(f"Failed to parse questions JSON for '{milestone_label}': {exc}")

        # Fallback: return 5 generic questions
        return [
            {"id": "q1", "text": f"What is {milestone_label} and what primary problems does it solve?", "type": "conceptual", "tested_concept": f"{milestone_label} Core Principles", "ideal_answer": f"{milestone_label} is a core foundation used to build robust, scalable applications."},
            {"id": "q2", "text": f"Explain the architectural trade-offs when implementing {milestone_label}.", "type": "conceptual", "tested_concept": "Architectural Trade-offs", "ideal_answer": "Key trade-offs include complexity vs performance and maintainability."},
            {"id": "q3", "text": f"Describe a practical hands-on workflow or implementation pattern with {milestone_label}.", "type": "practical", "tested_concept": "Practical Workflow", "ideal_answer": "Standard implementation involves proper configuration, error boundaries, and modular structure."},
            {"id": "q4", "text": f"What common debugging issues or runtime gotchas occur in {milestone_label}?", "type": "debugging", "tested_concept": "Debugging & Troubleshooting", "ideal_answer": "Common gotchas stem from unhandled edge cases, missing dependencies, or state synchronization errors."},
            {"id": "q5", "text": f"How do you ensure security, performance, and scalability when using {milestone_label}?", "type": "scenario", "tested_concept": "Production Readiness", "ideal_answer": "By establishing automated testing, profiling performance bottlenecks, and enforcing security best practices."},
        ]

    # ─────────────────────────────────────────────────────────────
    # Private helpers — Answer Evaluation
    # ─────────────────────────────────────────────────────────────

    def _evaluate_with_llm(
        self,
        milestone_label: str,
        difficulty: str,
        questions: List[Dict],
        answers: List[Dict],
        syllabus_context: Optional[str] = None,
    ) -> Optional[Dict]:
        """Use Groq to generate a full, rich diagnostic evaluation."""
        q_map = {q["id"]: q for q in questions}
        eval_payload = []
        for ans in answers:
            qid = ans.get("question_id")
            q = q_map.get(qid, {})
            eval_payload.append({
                "question_id": qid,
                "question_text": q.get("text", ""),
                "question_type": q.get("type", "conceptual"),
                "tested_concept": q.get("tested_concept", milestone_label),
                "ideal_answer": q.get("ideal_answer", ""),
                "user_answer": ans.get("answer", "").strip(),
            })

        syllabus_str = f"\nWeekly Syllabus Context:\n{syllabus_context.strip()}" if syllabus_context else ""

        prompt = f"""You are a Lead Interview Evaluator reviewing a candidate's mock interview on "{milestone_label}" ({difficulty} level).{syllabus_str}

Evaluate the candidate's answers against the gold standard ideal answers. Be encouraging yet technically rigorous.

Candidate's Q&A Submissions:
{json.dumps(eval_payload, indent=2)}

Provide a comprehensive diagnostic report formatted as ONLY a valid JSON object with these EXACT keys:
{{
  "readiness_score": <float between 0 and 100>,
  "overall_verdict": "<'Strong' if score >= 80 else 'Needs Review' if score >= 60 else 'Critical Gap'>",
  "executive_summary": "<2-3 sentence overview of the candidate's readiness, strengths, and primary area to improve>",
  "category_scores": {{
    "conceptual": <float 0-100>,
    "practical": <float 0-100>,
    "debugging": <float 0-100>,
    "communication": <float 0-100>
  }},
  "identified_weaknesses": ["<weak topic 1>", "<weak topic 2>"],
  "strengths": ["<strength 1 with specific concept>", "<strength 2>"],
  "critical_gaps": ["<critical gap 1 with actionable insight>"],
  "detailed_questions": [
    {{
      "question_id": "q1",
      "score": <float 0-100>,
      "verdict": "<'Strong' | 'Adequate' | 'Needs Review' | 'Critical Gap'>",
      "strengths": ["<what user explained well or correctly identified>"],
      "missing_points": ["<what critical concepts or nuances were omitted>"],
      "feedback": "<concise constructive feedback (1-2 sentences)>",
      "action_items": ["<concrete revision task or code example to practice>"]
    }}
  ],
  "action_checklist": [
    {{
      "id": "act-1",
      "topic": "<topic name>",
      "severity": "<'High' | 'Medium' | 'Low'>",
      "action_text": "<clear action step>",
      "recommended_study_day": "<e.g. 'Day 2' or 'Day 4'>"
    }}
  ]
}}

Return ONLY valid JSON. No markdown fences, no explanatory text outside JSON."""

        try:
            raw = self._call_groq(prompt, max_tokens=3000)
            data = json.loads(raw)
            if isinstance(data, dict) and "readiness_score" in data and "detailed_questions" in data:
                # Merge question metadata into detailed_questions
                merged_questions = []
                for dq in data.get("detailed_questions", []):
                    qid = dq.get("question_id")
                    q_meta = q_map.get(qid, {})
                    user_ans = next((a.get("answer", "") for a in answers if a.get("question_id") == qid), "")
                    merged_questions.append({
                        "question_id": qid,
                        "question_text": q_meta.get("text", f"Question {qid}"),
                        "question_type": q_meta.get("type", "conceptual"),
                        "tested_concept": q_meta.get("tested_concept", milestone_label),
                        "user_answer": user_ans,
                        "ideal_answer": q_meta.get("ideal_answer", ""),
                        "score": round(float(dq.get("score", 0)), 1),
                        "verdict": dq.get("verdict", "Adequate"),
                        "strengths": dq.get("strengths", []),
                        "missing_points": dq.get("missing_points", []),
                        "feedback": dq.get("feedback", ""),
                        "action_items": dq.get("action_items", []),
                    })

                data["detailed_questions"] = merged_questions
                data["readiness_score"] = round(float(data["readiness_score"]), 1)
                data.setdefault("category_scores", {
                    "conceptual": data["readiness_score"],
                    "practical": max(0.0, data["readiness_score"] - 5),
                    "debugging": max(0.0, data["readiness_score"] - 10),
                    "communication": min(100.0, data["readiness_score"] + 5),
                })
                data.setdefault("action_checklist", [])
                data.setdefault("strengths", [])
                data.setdefault("critical_gaps", [])
                data.setdefault("identified_weaknesses", [])
                return data
        except Exception as exc:
            logger.warning(f"Groq LLM evaluation failed: {exc}")

        return None

    def _evaluate_with_embeddings(
        self,
        milestone_label: str,
        questions: List[Dict],
        answers: List[Dict],
        q_map: Dict,
    ) -> Dict:
        """Deterministic fallback using SentenceTransformer embeddings."""
        detailed_questions = []
        scores = []
        weaknesses = []
        strengths = []
        critical_gaps = []
        action_checklist = []

        for i, ans in enumerate(answers):
            qid = ans.get("question_id")
            user_answer = ans.get("answer", "").strip()
            question = q_map.get(qid, {})
            q_text = question.get("text", "")
            q_type = question.get("type", "conceptual")
            tested = question.get("tested_concept", f"{milestone_label} Part {i+1}")
            ideal = question.get("ideal_answer", "")

            if not question or not user_answer:
                score = 0.0
                feedback = "No answer was provided for this question."
                missing = ["Complete response required", f"Explain {tested}"]
                q_strengths = []
                q_actions = [f"Study the fundamentals of {tested}"]
            else:
                score, feedback = self._score_answer(q_text, ideal, user_answer)
                if score >= 75:
                    q_strengths = [f"Demonstrated good awareness of {tested}"]
                    missing = []
                    q_actions = ["Solidify this concept with advanced edge cases"]
                else:
                    q_strengths = ["Attempted question structure"]
                    missing = [f"Missing depth in technical explanation of {tested}"]
                    q_actions = [f"Review core concepts of {tested}"]

            verdict = "Strong" if score >= 80 else "Adequate" if score >= 60 else "Needs Review" if score >= 40 else "Critical Gap"

            if score < 60:
                weaknesses.append(tested)
                action_checklist.append({
                    "id": f"act-{i+1}",
                    "topic": tested,
                    "severity": "High" if score < 40 else "Medium",
                    "action_text": f"Review {tested} and practice implementing a working example",
                    "recommended_study_day": f"Day {min(5, i + 1)}",
                })
                if score < 40:
                    critical_gaps.append(f"Significant knowledge gap in {tested}")
            else:
                strengths.append(f"Solid grasp of {tested}")

            detailed_questions.append({
                "question_id": qid,
                "question_text": q_text,
                "question_type": q_type,
                "tested_concept": tested,
                "user_answer": user_answer,
                "ideal_answer": ideal,
                "score": round(score, 1),
                "verdict": verdict,
                "strengths": q_strengths,
                "missing_points": missing,
                "feedback": feedback,
                "action_items": q_actions,
            })
            scores.append(score)

        readiness = round(float(np.mean(scores)) if scores else 0.0, 1)
        verdict = self._verdict(readiness)

        return {
            "readiness_score": readiness,
            "overall_verdict": verdict,
            "executive_summary": f"Assessment completed for {milestone_label}. Overall readiness score is {readiness}%.",
            "category_scores": {
                "conceptual": readiness,
                "practical": max(0.0, readiness - 5),
                "debugging": max(0.0, readiness - 8),
                "communication": min(100.0, readiness + 4),
            },
            "identified_weaknesses": list(set(weaknesses))[:3],
            "strengths": strengths[:3],
            "critical_gaps": critical_gaps[:2],
            "detailed_questions": detailed_questions,
            "action_checklist": action_checklist,
        }

    def _score_answer(
        self,
        question_text: str,
        ideal_answer: str,
        user_answer: str,
    ) -> Tuple[float, str]:
        """Score a single answer 0-100 using semantic cosine similarity + length heuristic."""
        word_count = len(user_answer.split())
        if word_count < 5:
            length_score = 10.0
        elif word_count < 15:
            length_score = 40.0
        elif word_count < 40:
            length_score = 70.0
        else:
            length_score = 100.0

        if ideal_answer.strip():
            vecs = self.embedder.encode([user_answer, ideal_answer])
            sim = float(cosine_similarity([vecs[0]], [vecs[1]])[0][0])
            semantic_score = max(0.0, min(100.0, sim * 100))
        else:
            vecs = self.embedder.encode([user_answer, question_text])
            sim = float(cosine_similarity([vecs[0]], [vecs[1]])[0][0])
            semantic_score = max(0.0, min(100.0, sim * 80))

        score = 0.70 * semantic_score + 0.30 * length_score

        if score >= 80:
            feedback = "Strong answer. Demonstrates clear conceptual understanding and precision."
        elif score >= 60:
            feedback = "Adequate answer. Covers the basics but lacks specific technical details or examples."
        elif score >= 40:
            feedback = "Partial answer. Several key concepts are missing from the benchmark."
        else:
            feedback = "Insufficient answer. This area needs thorough review before technical interviews."

        return round(score, 1), feedback

    def _verdict(self, score: float) -> str:
        if score >= 80:
            return "Strong"
        elif score >= 60:
            return "Needs Review"
        else:
            return "Critical Gap"


import asyncio
import sys
import time

sys.path.insert(0, ".")
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sentence_transformers import SentenceTransformer
from backend.services.mock_engine import MockEngine

async def main():
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    engine = MockEngine(embedder)

    # Test question generation
    print("Generating questions for 'Docker Fundamentals'...")
    questions = engine.generate_questions("Docker Fundamentals", "Beginner")
    print(f"Generated {len(questions)} questions")
    for q in questions:
        print(f"  [{q['type']}] {q['text'][:80]}...")

    # Test answer evaluation with a weak answer
    answers = [
        {"question_id": q["id"], "answer": "I don't know much about this."}
        for q in questions[:3]
    ]
    # Add one good answer if 4th question exists
    if len(questions) > 3:
        answers.append({
            "question_id": questions[3]["id"],
            "answer": "Docker is a containerization platform that packages applications and dependencies into isolated containers, ensuring consistency across development, staging, and production environments. Images are built from Dockerfiles and containers are running instances of those images."
        })

    print("\nEvaluating answers...")
    result = engine.evaluate_answers("Docker Fundamentals", "Beginner", answers)
    print(f"Readiness score: {result['readiness_score']}")
    print(f"Verdict: {result['overall_verdict']}")
    print(f"Weaknesses: {result['identified_weaknesses']}")

    # Test remedial roadmap generation
    if result["identified_weaknesses"]:
        print("\nGenerating remedial roadmap...")
        remedial = await engine.build_remedial_roadmap(
            result["identified_weaknesses"], "DevOps Engineer", embedder
        )
        if remedial:
            print(f"Remedial nodes: {len(remedial['nodes'])}")
        else:
            print("No remedial roadmap (no weaknesses)")

    # Step 4 — Test caching behavior
    # First call (should populate cache)
    t0 = time.time()
    q1 = engine.generate_questions("Kubernetes Basics", "Intermediate")
    t1 = time.time()
    print(f"\nFirst call: {t1-t0:.2f}s")

    # Second call (should be instant — from cache)
    t2 = time.time()
    q2 = engine.generate_questions("Kubernetes Basics", "Intermediate")
    t3 = time.time()
    print(f"Cached call: {t3-t2:.4f}s")
    assert t3-t2 < 0.01, "Cache not working — second call took too long"
    print("[OK] Question caching works")

    # Fallback test
    fallback = engine._parse_questions("invalid json response", "Fallback Milestone")
    assert len(fallback) >= 3, f"Expected at least 3 fallback questions, got {len(fallback)}"
    print("[OK] Fallback questions work (generic questions returned)")

    print("\nALL SMOKE TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())

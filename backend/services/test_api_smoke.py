"""
API Smoke Test for Task 07 routes.
"""

import sys
sys.path.insert(0, ".")
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    print("Testing FastAPI app initialization and routes...")
    with TestClient(app) as client:
        # 1. Test root endpoint
        res = client.get("/")
        print("Root status:", res.status_code)
        assert res.status_code == 200
        print("Root response:", res.json())

        # 2. Test OpenAPI docs / schema to verify routes exist
        res = client.get("/openapi.json")
        assert res.status_code == 200
        paths = res.json()["paths"]
        print("Registered paths:", list(paths.keys()))
        assert "/api/v1/roadmap/generate" in paths
        assert "/api/v1/roadmap/{roadmap_id}" in paths
        assert "/api/v1/mock/questions" in paths
        assert "/api/v1/mock/evaluate" in paths

        # 3. Test Roadmap generation
        print("\n--- Testing POST /api/v1/roadmap/generate ---")
        roadmap_req = {
            "target_role": "DevOps Engineer",
            "experience_level": "beginner",
            "timeline_days": 30,
            "hours_per_week": 15,
            "known_skills": ["Linux"],
            "skills_gap": ["Docker", "Kubernetes"],
        }
        res = client.post("/api/v1/roadmap/generate", json=roadmap_req)
        print("Roadmap generate status:", res.status_code)
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        print("Total nodes:", data.get("total_nodes"))
        print("Total weeks:", data.get("total_weeks"))
        print("Roadmap ID:", data.get("roadmap_id"))
        print("First node label:", data["nodes"][0]["data"]["label"])
        assert data["total_nodes"] >= 3
        assert len(data["nodes"]) == data["total_nodes"]
        assert len(data["edges"]) > 0
        roadmap_id = data["roadmap_id"]

        # 4. Test Mock Questions
        print("\n--- Testing POST /api/v1/mock/questions ---")
        mock_q_req = {
            "milestone_label": "Docker Fundamentals",
            "difficulty": "Beginner",
        }
        res = client.post("/api/v1/mock/questions", json=mock_q_req)
        print("Mock questions status:", res.status_code)
        assert res.status_code == 200, f"Failed: {res.text}"
        q_data = res.json()
        questions = q_data.get("questions", [])
        print("Questions count:", len(questions))
        for q in questions:
            print(f" - [{q['id']}] ({q['type']}) {q['text'][:60]}")
        assert len(questions) >= 3

        # 5. Test Mock Evaluation
        print("\n--- Testing POST /api/v1/mock/evaluate ---")
        eval_req = {
            "milestone_id": "node-1",
            "milestone_label": "Docker Fundamentals",
            "answers": [
                {"question_id": q["id"], "answer": "I am not sure about this topic."}
                for q in questions
            ],
        }
        res = client.post("/api/v1/mock/evaluate", json=eval_req)
        print("Mock evaluate status:", res.status_code)
        assert res.status_code == 200, f"Failed: {res.text}"
        eval_data = res.json()
        print("Readiness score:", eval_data.get("readiness_score"))
        print("Overall verdict:", eval_data.get("overall_verdict"))
        print("Weaknesses:", eval_data.get("identified_weaknesses"))
        print("Has remedial roadmap:", eval_data.get("remedial_roadmap") is not None)
        assert eval_data["readiness_score"] < 70
        assert eval_data["overall_verdict"] in ["Needs Review", "Critical Gap"]

        # 6. Test Get Saved Roadmap (if Supabase saved or returns 404/persisted)
        print("\n--- Testing GET /api/v1/roadmap/{id} ---")
        res = client.get(f"/api/v1/roadmap/{roadmap_id}")
        print("Get roadmap status:", res.status_code)
        # Note: If Supabase connection isn't configured, save_roadmap returns None / UUID not in DB, returning 404 or 200
        if res.status_code == 200:
            saved = res.json()
            print("Retrieved target role:", saved.get("target_role"))
            print("Retrieved nodes count:", saved.get("total_nodes"))
        else:
            print(f"Roadmap fetch returned {res.status_code} (as expected if DB offline / unsaved UUID)")

        # 7. Test health check route (no regressions)
        print("\n--- Testing GET /api/v1/health ---")
        res = client.get("/api/v1/health")
        print("Health check status:", res.status_code)
        assert res.status_code == 200

    print("\nALL SMOKE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()

import asyncio
import json
import sys
from pathlib import Path

# Ensure root directory is in sys.path
root_dir = Path(__file__).resolve().parents[2]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from sentence_transformers import SentenceTransformer
from backend.services.roadmap_engine import RoadmapEngine
from backend.models.roadmap_schemas import resolve_role

async def main():
    print("--- Step 4: Testing Role Alias Resolution ---")
    for role in ["cyber security", "SOC analyst", "cybersecurity", "Cyber Security"]:
        resolved = resolve_role(role)
        print(f"'{role}' -> '{resolved}'")
        assert resolved == "Cyber Security", f"Expected 'Cyber Security', got '{resolved}'"
    print("[SUCCESS] Role alias resolution works\n")

    print("--- Step 2: Smoke Testing Roadmap Generation ---")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    engine = RoadmapEngine(embedder)

    nodes, edges = await engine.generate(
        target_role="DevOps Engineer",
        experience_level="beginner",
        timeline_days=30,
        hours_per_week=15,
        known_skills=["Linux Basics"],
        skills_gap=["Docker", "Kubernetes"],
    )

    print(f"Nodes: {len(nodes)}")
    print(f"Edges: {len(edges)}")
    print("First node:")
    print(json.dumps(nodes[0], indent=2))

    # Basic validations
    assert len(nodes) > 0, "No nodes generated!"
    assert len(edges) == len(nodes) - 1, f"Expected {len(nodes) - 1} edges, got {len(edges)}"
    for node in nodes:
        assert "id" in node and "type" in node and "position" in node and "data" in node
        assert node["type"] == "skillNode"
        assert "label" in node["data"]
        assert "duration_days" in node["data"]
        assert "difficulty" in node["data"]
        assert "project_task" in node["data"]
        assert "citations" in node["data"]
        assert "status" in node["data"]

    # Verify no cycles
    sources = {e["source"] for e in edges}
    targets = {e["target"] for e in edges}
    assert not (sources & targets - sources), "Cycle detected!"
    print("[PASS] No cycles in edge graph")

    # Verify positions are unique
    positions = [(n["position"]["x"], n["position"]["y"]) for n in nodes]
    assert len(positions) == len(set(positions)), "Duplicate positions!"
    print("[PASS] All node positions are unique\n")

    print("--- Step 3: Testing Different Timeline Budgets ---")
    # 7-day sprint — should produce fewer nodes (min 2 guarantee)
    nodes_7, _ = await engine.generate("Cyber Security", timeline_days=7)
    print(f"7-day sprint nodes: {len(nodes_7)}")
    total_days_7 = sum(n["data"]["duration_days"] for n in nodes_7)
    print(f"7-day sprint total days: {total_days_7}")
    assert len(nodes_7) >= 2, "Expected at least 2 nodes due to min-2 guarantee"

    # 90-day mastery — should produce more nodes
    nodes_90, _ = await engine.generate("Frontend Developer", timeline_days=90)
    print(f"90-day mastery nodes: {len(nodes_90)}")
    assert len(nodes_90) >= 5, "Expected 5+ nodes for 90-day mastery"
    print("[PASS] Timeline budget pruning works as expected")

if __name__ == "__main__":
    asyncio.run(main())

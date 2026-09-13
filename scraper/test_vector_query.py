import asyncio, sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.insert(0, ".")
from sentence_transformers import SentenceTransformer
from backend.services.rag_engine import DynamicRAGEngine

async def main():
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    engine = DynamicRAGEngine(embedder)
    
    insights = await engine.get_role_insights("Cyber Security")
    print(f"Retrieved {len(insights)} insights for 'Cyber Security'")
    
    if insights:
        print("\nTop 3 citations preview:")
        cites = engine.format_citations_for_node(insights, max_per_node=3)
        for c in cites:
            print(f"  [{c['subreddit']}] ▲{c['upvotes']} — {c['excerpt'][:80]}...")
    else:
        print("❌ No insights returned — check DB ingestion")

if __name__ == "__main__":
    asyncio.run(main())

# backend/services/test_rag_smoke.py
# Run from BNB-HACKATHON/: python -m backend.services.test_rag_smoke
import asyncio
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sentence_transformers import SentenceTransformer
from backend.services.rag_engine import DynamicRAGEngine

async def main():
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    engine = DynamicRAGEngine(embedder)
    
    # Should be a cache miss → either trigger scraper or return []
    # (scraper won't be triggered yet; dynamic_scraper.js tested in Task 08)
    insights = await engine.get_role_insights("Cyber Security")
    print(f"Returned {len(insights)} insights for 'Cyber Security'")
    
    if insights:
        print("First citation preview:")
        cites = engine.format_citations_for_node(insights, max_per_node=1)
        print(cites[0])

if __name__ == "__main__":
    asyncio.run(main())

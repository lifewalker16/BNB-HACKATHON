"""
Batch ingestion script: reads scraped Reddit JSON files and inserts into Supabase community_insights.

Usage:
  python scraper/extract_insights.py --file reddit/data/cyber_security_discussions.json --role "Cyber Security"
  python scraper/extract_insights.py --file reddit/data/frontend_discussions.json --role "Frontend Developer"

Run from BNB-HACKATHON/ directory.
"""

import asyncio
import json
import argparse
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sentence_transformers import SentenceTransformer
from backend.services.rag_engine import DynamicRAGEngine
from backend.database.supabase_db import count_role_insights


async def ingest_file(file_path: str, role_name: str):
    print(f"\n{'='*60}")
    print(f"INGESTING: {role_name}")
    print(f"File: {file_path}")
    print(f"{'='*60}\n")

    # Load JSON file
    with open(file_path, "r", encoding="utf-8-sig") as f:
        discussions = json.load(f)

    print(f"Loaded {len(discussions)} discussions from file.")

    # Check existing count
    before_count = await count_role_insights(role_name)
    print(f"Existing chunks in DB for '{role_name}': {before_count}")

    if before_count >= 20:
        print(f"✅ Already have {before_count} chunks for '{role_name}'. Skipping ingestion.")
        return

    # Load embedder
    print("Loading SentenceTransformer (all-MiniLM-L6-v2)...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    engine = DynamicRAGEngine(embedder)

    # Normalize discussion format (reddit/data files use 'topComments' key)
    normalized = []
    for disc in discussions:
        # reddit/data format uses 'topComments' — adapt to rag_engine's 'comments'
        comments = disc.get("topComments") or disc.get("comments") or []
        normalized.append({
            "role":     role_name,
            "subreddit": disc.get("subreddit", "unknown"),
            "title":    disc.get("title", ""),
            "selftext": disc.get("selftext", ""),
            "score":    disc.get("score", 0),
            "url":      disc.get("url", disc.get("permalink", "")),
            "author":   disc.get("author", "anonymous"),
            "comments": [
                {
                    "author": c.get("author", "anonymous"),
                    "body":   c.get("body", ""),
                    "score":  c.get("score", 0),
                }
                for c in comments
            ],
        })

    print(f"Ingesting {len(normalized)} normalized discussions...")
    await engine._ingest(normalized)

    after_count = await count_role_insights(role_name)
    print(f"\n✅ DONE! Chunks in DB for '{role_name}': {before_count} → {after_count}")
    print(f"   (+{after_count - before_count} new chunks inserted)")


def main():
    parser = argparse.ArgumentParser(description="Ingest Reddit discussion JSON into Supabase pgvector")
    parser.add_argument("--file", required=True, help="Path to the *_discussions.json file")
    parser.add_argument("--role", required=True, help="Role name to tag insights with")
    args = parser.parse_args()

    asyncio.run(ingest_file(args.file, args.role))


if __name__ == "__main__":
    main()

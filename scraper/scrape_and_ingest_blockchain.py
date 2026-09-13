"""
Live Scrape & Ingestion for Blockchain Developer.
Connects via Chrome CDP (port 9222), scrapes real Reddit discussions from
r/ethdev, r/solidity, r/web3, r/developersIndia, and r/cscareerquestions,
vectorizes all chunks with all-MiniLM-L6-v2, and saves to Supabase.
"""

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

load_dotenv(Path(".") / ".env")

from sentence_transformers import SentenceTransformer
from backend.services.rag_engine import DynamicRAGEngine
from backend.database.supabase_db import count_role_insights

async def run_live_scrape_and_ingest(role_name="Blockchain Developer"):
    print("=" * 70)
    print(f"   LIVE REDDIT SCRAPE & INGESTION: '{role_name}'")
    print("=" * 70)

    # 1. Check existing count in Supabase
    before_count = await count_role_insights(role_name)
    print(f"\n[1] Current chunks in Supabase for '{role_name}': {before_count}")

    # 2. Trigger dynamic scraper
    scraper_path = Path(__file__).resolve().parent / "dynamic_scraper.js"
    cmd = ["node", str(scraper_path), role_name]

    print(f"\n[2] Launching live Reddit scraper via Chrome CDP (port 9222)...")
    print(f"    Subreddits targeting: r/ethdev, r/solidity, r/web3, r/developersIndia, r/cscareerquestions")
    
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )

    if proc.stderr:
        for line in proc.stderr.strip().splitlines():
            print(f"    {line}")

    if proc.returncode != 0 or not proc.stdout.strip():
        print(f"\n[ERROR] Scraper failed with code {proc.returncode}")
        return

    try:
        discussions = json.loads(proc.stdout.strip())
    except Exception as e:
        print(f"\n[ERROR] Failed to parse scraper JSON output: {e}")
        return

    print(f"\n[3] Successfully scraped {len(discussions)} real Reddit discussions!")
    
    # Save raw output to reddit/data/ for reproducibility
    data_dir = Path(__file__).resolve().parents[1] / "reddit" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    raw_file = data_dir / f"blockchain_developer_discussions_raw.json"
    with open(raw_file, "w", encoding="utf-8") as f:
        json.dump(discussions, f, indent=2, ensure_ascii=False)
    print(f"    Saved raw JSON to: {raw_file}")

    # 4. Ingest and Vectorize into Supabase
    print(f"\n[4] Initializing SentenceTransformer ('all-MiniLM-L6-v2') & chunking...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    rag_engine = DynamicRAGEngine(embedder)

    print(f"    Embedding chunks and inserting into Supabase community_insights...")
    await rag_engine._ingest(discussions)

    # 5. Verify final count
    after_count = await count_role_insights(role_name)
    print("\n" + "=" * 70)
    print(f"🎉 INGESTION COMPLETE for '{role_name}'!")
    print(f"   • Chunks in DB before: {before_count}")
    print(f"   • Chunks in DB after : {after_count}")
    print(f"   • New chunks indexed : +{after_count - before_count}")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_live_scrape_and_ingest())

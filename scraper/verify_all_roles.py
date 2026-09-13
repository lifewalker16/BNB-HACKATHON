import asyncio, sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.insert(0, ".")
from backend.database.supabase_db import count_role_insights

async def main():
    roles = ["Cyber Security", "Frontend Developer", "DevOps Engineer", "AI/ML Engineer"]
    print("\nVector DB coverage:")
    print("-" * 40)
    for role in roles:
        count = await count_role_insights(role)
        status = "✅" if count >= 10 else "⚠️ LOW"
        print(f"{status} {role}: {count} chunks")

if __name__ == "__main__":
    asyncio.run(main())

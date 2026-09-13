import asyncio, os
from dotenv import load_dotenv
load_dotenv()
import sys; sys.path.insert(0, ".")

from backend.database.supabase_db import count_role_insights

async def main():
    count = await count_role_insights("Cyber Security")
    print(f"Cyber Security insights in DB: {count}")

asyncio.run(main())

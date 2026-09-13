import os
import httpx
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL or SUPABASE_KEY missing in .env")
    exit(1)

base_url = supabase_url.rstrip("/")
headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
}

print("=== Testing Tables ===")
for table in ["analyses", "user_roadmaps", "community_insights"]:
    r = httpx.get(f"{base_url}/rest/v1/{table}?limit=1", headers=headers)
    print(f"Table '{table}': Status {r.status_code}")

print("\n=== Testing Vector RPC Function ===")
dummy_vector = [0.0] * 384
rpc_payload = {
    "query_embedding": dummy_vector,
    "target_role": "Cybersecurity",
    "match_threshold": 0.0,
    "match_count": 1,
}
r_rpc = httpx.post(f"{base_url}/rest/v1/rpc/match_community_insights", headers=headers, json=rpc_payload)
print(f"RPC 'match_community_insights': Status {r_rpc.status_code}")
if r_rpc.status_code == 200:
    print("RPC result:", r_rpc.json())


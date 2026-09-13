import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    _ENV_PATH = Path(__file__).resolve().parents[2] / '.env'
    load_dotenv(_ENV_PATH)
except ImportError:
    pass

# App metadata
APP_TITLE = 'RadarDev — SkillBridge AI API'
APP_VERSION = '1.0.0'
APP_DESCRIPTION = 'Adaptive career roadmap platform powered by real developer community data'

# ── CORS ──
ENVIRONMENT = os.getenv('ENVIRONMENT', 'dev')
NEXT_PUBLIC_FRONTEND_URL = os.getenv('NEXT_PUBLIC_FRONTEND_URL', '')

if ENVIRONMENT == 'dev':
    ALLOWED_ORIGINS = ['*']
else:
    ALLOWED_ORIGINS = [
        NEXT_PUBLIC_FRONTEND_URL,
        'https://radardev.vercel.app',
    ]

# ── File uploads ──
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

SUPPORTED_MIME_TYPES = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}
SUPPORTED_EXTENSIONS = {'.pdf', '.doc', '.docx'}

# ── NLP models ──
SPACY_MODEL_PRIMARY = 'en_core_web_md'
SPACY_MODEL_SECONDARY = 'en_core_web_sm'          # BUG FIX: removed spurious leading "
SENTENCE_TRANSFORMER_MODEL = os.getenv('SENTENCE_TRANSFORMER_MODEL', 'all-MiniLM-L6-v2')

# ── ATS scoring weights ──
SCORE_WEIGHTS = {
    'formatting': 20,
    'keywords': 25,
    'content': 25,
    'skill_validation': 15,
    'ats_compatibility': 15,
}
JD_KEYWORD_WEIGHT = 0.6
JD_SEMANTIC_WEIGHT = 0.4

# ── Supabase ──
SUPABASE_URL      = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY      = os.getenv('SUPABASE_KEY', '')        # service_role key
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET', '')

# ── Groq LLM ──
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GROQ_MODEL   = os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b')

# ── Scraper ──
ENABLE_LIVE_CDP_SCRAPER = os.getenv('ENABLE_LIVE_CDP_SCRAPER', 'true').lower() == 'true'
CHROME_CDP_URL          = os.getenv('CHROME_CDP_URL', 'http://localhost:9222')
MCP_SERVER_PATH         = os.getenv(
    'MCP_SERVER_PATH',
    str(Path(__file__).resolve().parents[2] / 'reddit-unofficial-api' / 'build' / 'index.js')
)

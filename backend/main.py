import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import (
    ALLOWED_ORIGINS,
    APP_DESCRIPTION,
    APP_TITLE,
    APP_VERSION,
    SPACY_MODEL_PRIMARY,
    SPACY_MODEL_SECONDARY,
    SENTENCE_TRANSFORMER_MODEL,
)
from backend.api.routes import router

logger = logging.getLogger('radardev')


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Starting RadarDev API...')

    import spacy
    try:
        app.state.nlp = spacy.load(SPACY_MODEL_PRIMARY)
        logger.info(f'Loaded {SPACY_MODEL_PRIMARY}')
    except OSError:
        logger.warning(f'{SPACY_MODEL_PRIMARY} not found — falling back to {SPACY_MODEL_SECONDARY}')
        app.state.nlp = spacy.load(SPACY_MODEL_SECONDARY)
        logger.info(f'Loaded {SPACY_MODEL_SECONDARY} (fallback)')

    from sentence_transformers import SentenceTransformer
    app.state.embedder = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)
    logger.info(f'Loaded {SENTENCE_TRANSFORMER_MODEL}')

    logger.info('All models loaded. API ready.')
    yield
    logger.info('Shutting down RadarDev API.')


app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url='/docs',
    redoc_url='/redoc',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Existing ATS analysis routes (from ai-resume-ats)
app.include_router(router)

# New RadarDev routes
from backend.api.routes_roadmap import router_roadmap
from backend.api.routes_mock import router_mock
app.include_router(router_roadmap)
app.include_router(router_mock)


@app.get('/')
async def root():
    return {
        'name': 'RadarDev — SkillBridge AI API',
        'version': APP_VERSION,
        'endpoints': {
            'POST   /api/v1/analyze-resume':  'ATS resume analysis',
            'GET    /api/v1/health':           'Health check',
            'POST   /api/v1/roadmap/generate': 'Generate adaptive roadmap (Task 07)',
            'GET    /api/v1/roadmap/{id}':     'Fetch saved roadmap (Task 07)',
            'POST   /api/v1/mock/questions':   'Get mock interview questions (Task 07)',
            'POST   /api/v1/mock/evaluate':    'Evaluate mock answers (Task 07)',
        },
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend.main:app', host='0.0.0.0', port=8000, reload=True)

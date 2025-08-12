# Bingeworthy.ai - Integrated Repo

This repository contains a Next.js frontend (from your uploaded UI) and a FastAPI backend.

## Quick start (local)

### Backend
```
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env    # edit values (TMDB_API_KEY, OMDB_API_KEY, DATABASE_URL)
uvicorn app:app --reload --port 8000
```

### Frontend (Next.js app)
```
cd frontend
# install using npm or pnpm as the extracted UI expects pnpm; using npm is fine
npm install
# create .env.local with:
# NEXT_PUBLIC_API_BASE=https://bingeworthy-ai.onrender.com
# NEXT_PUBLIC_TMDB_API_KEY=YOUR_TMDB_KEY_HERE (frontend doesn't require TMDB key since backend returns poster/trailer)
npm run dev
```

## Deploy
- Backend: Deploy `backend/` on Render as a Python web service. Set env vars from .env.example.
- Frontend: Deploy `frontend/` on Vercel. Set `NEXT_PUBLIC_API_BASE` to https://bingeworthy-ai.onrender.com


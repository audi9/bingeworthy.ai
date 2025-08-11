
bingeworthy.ai - Updated project with detailed comments, autosuggest improvements, ratings aggregation and pagination.

Key updates:
- Backend: detailed comments, ratings aggregation, pagination, suggest endpoint, Postgres-ready Alembic migration uses Text column for cache.
- Frontend: client-side debounce for search input (reduces calls), pagination controls, suggest endpoint usage.

Run backend locally:
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit .env with your API keys and SECRET_KEY
uvicorn app:app --reload --port 8000

Run frontend locally:
cd frontend
npm install
echo "NEXT_PUBLIC_API_BASE=http://localhost:8000" > .env.local
npm run dev

Default admin on first run: admin / admin123 (change immediately)

Backend (FastAPI):


cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
Runs on http://localhost:8000

Managed/public database (recommended for shared backend):

1. Create a hosted Postgres DB (Neon/Supabase/Railway)
2. Set backend env:
	- DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<db>?ssl=require
	- CORS_ORIGINS=http://localhost:3000,https://your-frontend-domain
3. Restart backend

Frontend (Next.js):


cd frontend
npm install
npm run dev
Runs on http://localhost:3000

Or all at once with Docker:


docker-compose up

TikTok ad scraper (Apify):


./scripts/run_scrape_tiktok_ads.sh --query "celsius drinks"
# Set APIFY_TOKEN in backend/.env first.
# Results are filtered to ads mentioning the brand term (e.g. "celsius").
# For EU brands, try: --mode ad_library --country GB

Scraped videos are kept out of git:

- `scripts/output/*` is ignored.
- Keep only `scripts/output/.gitkeep` in the repository.

On-demand collection into backend DB:

- Queue Meta only:
	- `POST /api/v1/ads/collect/{brand_id}?source=meta`
- Queue TikTok only:
	- `POST /api/v1/ads/collect/{brand_id}?source=tiktok&tiktok_industry_id=7`
- Queue both:
	- `POST /api/v1/ads/collect/{brand_id}?source=both&tiktok_industry_id=7`

The collection task ingests, re-scores ad health, and re-clusters creative families.
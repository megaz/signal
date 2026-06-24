Backend (FastAPI):


cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
Runs on http://localhost:8000

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
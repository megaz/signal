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
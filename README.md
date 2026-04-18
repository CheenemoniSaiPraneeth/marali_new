# Elite Execution Tracker

FastAPI + React SPA. Data stored as JSON. Deployable on Render.

## Local Dev

```bash
# Backend
pip install -r requirements.txt
uvicorn app:app --reload

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## Render Deployment

1. Push this repo to GitHub

2. On Render → New Web Service → connect repo

3. Settings:
   - **Runtime**: Python 3
   - **Build Command**: `bash build.sh`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`

4. Add a **Persistent Disk** (Render free tier supports this):
   - Mount Path: `/data`
   - Set env var `DATA_PATH=/data/habit_data.json`

5. That's it. Data persists across deploys via the disk.

## Data Format

`habit_data.json` — a dict keyed by date string:

```json
{
  "2024-01-15": {
    "date": "2024-01-15",
    "dsa": true,
    "research": false,
    ...
    "score": 8
  }
}
```

# IncidentMind AI — Deployment Guide: Backend on Render + Frontend on Vercel

Follow this step-by-step guide to deploy the **FastAPI Backend on Render** and the **React Vite Frontend on Vercel**.

---

## 1. Push Code to GitHub

If your code is not yet on GitHub, run:

```bash
git remote add origin https://github.com/yokeshkumar19/incidentmind-ai.git
git branch -M master
git push -u origin master
```

---

## 2. Deploy Backend on Render

1. Sign in to **[Render.com](https://render.com)**.
2. Click **New +** → **Web Service**.
3. Select your repository (`incidentmind-ai`).
4. Configure the service:
   - **Name**: `incidentmind-api`
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `master`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. Under **Environment Variables**, add the following keys:

| Key | Value / Description |
|---|---|
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `SECRET_KEY` | *(Click "Generate" or enter a 32+ character random secret)* |
| `DATABASE_URL` | `sqlite:///./incidentmind.db` *(or your Supabase connection string)* |
| `SUPABASE_URL` | *(Copy from your local .env)* |
| `SUPABASE_KEY` | *(Copy from your local .env)* |
| `GROQ_API_KEY` | *(Copy from your local .env)* |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `HINDSIGHT_API_KEY` | *(Copy from your local .env)* |
| `HINDSIGHT_API_URL` | `https://api.hindsight.vectorize.io` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | *(Copy from your local .env)* |
| `SMTP_PASSWORD` | *(Copy from your local .env)* |
| `SMTP_FROM_EMAIL` | *(Copy from your local .env)* |
| `CORS_ORIGINS` | `*` |
| `APP_URL` | `https://your-app.vercel.app` *(Update this after deploying to Vercel)* |

6. Click **Deploy Web Service**.
7. Once deployed, note down your Render URL:  
   👉 **`https://incidentmind-api.onrender.com`** (Verify by visiting `https://incidentmind-api.onrender.com/api/health`).

---

## 3. Deploy Frontend on Vercel

1. Sign in to **[Vercel.com](https://vercel.com)**.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`incidentmind-ai`).
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://incidentmind-api.onrender.com/api` *(Your Render backend URL + `/api`)* |

6. Click **Deploy**.
7. In ~1 minute, Vercel will give you a live production URL:  
   👉 **`https://incidentmind-ai.vercel.app`**

---

## 4. Final Polish: Link Frontend URL to Backend
Go back to your **Render Dashboard** → `incidentmind-api` → **Environment** tab:
- Set `APP_URL` to your Vercel URL (e.g. `https://incidentmind-ai.vercel.app`).
- This ensures all team invite emails and password reset links route directly to your live Vercel app.


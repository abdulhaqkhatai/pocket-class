# Deployment Guide

Your app is ready for deployment! Follow these steps to go live.

## 1. Backend (Render)

1. Connect your GitHub repo to [Render](https://render.com).
2. Create a new **Web Service**.
3. Select your repository.
4. **Root Directory**: `server` (Important!)
5. **Build Command**: `npm install`
6. **Start Command**: `node server.js`
7. Add **Environment Variables**:
   - `MONGO_URL`: `mongodb+srv://ahk:ahk@cluster0.mntnzjc.mongodb.net/pocketclass?retryWrites=true&w=majority&appName=Cluster0`
   - `JWT_SECRET`: (Generate a random string or use `click generate` in Render)
   - `CLIENT_URL`: `https://your-vercel-frontend-url.vercel.app` (You will update this after deploying frontend)

## 2. Frontend (Vercel)

1. Connect your GitHub repo to [Vercel](https://vercel.com).
2. Import the project.
3. **Framework Preset**: Vite
4. **Root Directory**: `client` (Important! Click Edit)
5. Add **Environment Variables**:
   - `VITE_API_URL`: The URL of your deployed Render backend (e.g., `https://pocket-class-server.onrender.com`)
6. Deploy!

## 3. Final Connection

Once both are deployed:
1. Copy the Vercel URL (e.g., `https://pocket-class.vercel.app`).
2. Go back to Render → Environment Variables.
3. Update `CLIENT_URL` to match your Vercel URL.
4. Redeploy specific commit or wait for auto-deploy.

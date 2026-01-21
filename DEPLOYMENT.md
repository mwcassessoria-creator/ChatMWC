# 🚀 Deployment Guide - Vercel + Railway

## 📋 Prerequisites
- GitHub account (already done ✅)
- Vercel account (free): https://vercel.com/signup
- Railway account (free): https://railway.app

---

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway

### Step 2: Deploy Backend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `mwcassessoria-creator/ChatMWC`
4. Railway will auto-detect Node.js and start deploying

### Step 3: Configure Environment Variables
1. Go to your project → Variables tab
2. Add these variables:
   - `NODE_ENV` = `production`
   - `CORS_ORIGIN` = (leave empty for now, we'll add after Vercel)

### Step 4: Get Backend URL
1. Go to Settings → Domains
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://chatmwc-production.up.railway.app`)
4. **Save this URL** - you'll need it for Vercel!

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to https://vercel.com/signup
2. Click "Continue with GitHub"
3. Authorize Vercel

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. Import `mwcassessoria-creator/ChatMWC`
3. Vercel will auto-detect Vite

### Step 3: Configure Build Settings
**Root Directory:** Leave as `./` (project root)

**Build Command:** (should auto-fill)
```
cd client && npm install && npm run build
```

**Output Directory:**
```
client/dist
```

### Step 4: Add Environment Variables
Click "Environment Variables" and add:

| Name | Value |
|------|-------|
| `VITE_API_URL` | Your Railway URL (e.g., `https://chatmwc-production.up.railway.app`) |
| `VITE_SOCKET_URL` | Same as above |

### Step 5: Deploy
1. Click "Deploy"
2. Wait 1-2 minutes
3. Copy your Vercel URL (e.g., `https://chatmwc.vercel.app`)

---

## Part 3: Update Railway CORS

### Go back to Railway:
1. Open your project → Variables
2. Update `CORS_ORIGIN` to your Vercel URL
3. Example: `https://chatmwc.vercel.app`
4. Railway will auto-redeploy

---

## ✅ Verification

### Test Backend
Visit: `https://your-railway-url.up.railway.app/api/info`

Should return JSON or error (means it's running)

### Test Frontend
1. Visit your Vercel URL
2. Should see the dashboard
3. Check browser console for connection status

---

## 📱 WhatsApp Connection

**Important:** Railway will show logs with the QR code!

1. Go to Railway → Your Project → Deployments
2. Click latest deployment → View Logs
3. Look for the QR code in ASCII art
4. Scan with WhatsApp (Phone → Settings → Linked Devices)

---

## 🔧 Troubleshooting

### Frontend shows "Connection Refused"
- Check if Railway backend is running (green status)
- Verify `VITE_API_URL` in Vercel matches Railway URL exactly
- Redeploy Vercel after changing env vars

### CORS Error
- Update `CORS_ORIGIN` in Railway to match Vercel URL
- Make sure there's no trailing slash

### WhatsApp not connecting
- Check Railway logs for errors
- QR code expires after 60 seconds - refresh logs for new one
- Make sure Railway deployment is not sleeping (free tier sleeps after inactivity)

---

## 💰 Cost

Both platforms are **FREE** for this project:
- **Vercel:** Unlimited bandwidth, 100GB storage
- **Railway:** $5 free credit/month (enough for 24/7 uptime)

---

## 🎉 Next Steps

After deployment:
1. Share your Vercel URL with your team
2. Keep Railway running for WhatsApp connection
3. Monitor Railway logs for WhatsApp activity
4. Consider upgrading Railway if you need guaranteed uptime

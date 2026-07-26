# 🌟 SmileSpark AI — Production & Local Setup Guide

SmileSpark AI is a full-stack AI-powered positivity app that features an interactive AI Motivation Engine, a Smile Booth with real-time joy analysis, a Daily Positivity Challenge tracker, a Community Gallery, and **Spark Connect** — a real-time, anonymous random chat system built with WebSockets (Socket.IO) and persistent MongoDB Atlas storage.

---

## 🚀 Key Features

* **AI Motivation Engine**: Personalized, uplifting AI advice powered by Advanced AI with intelligent rate-limit fallbacks.
* **Smile Booth**: Camera-based AI smile analyzer and frame capture with instant joy scores and automatic canvas particle celebrations.
* **Spark Connect (Real-Time Anonymous Chat)**:
  * Instant random matchmaking for online visitors.
  * Real-time Socket.IO messaging with typing indicators, read receipts, and image sharing.
  * Auto-cleanup of stale sockets and queue isolation (prevents self-matching).
  * MongoDB Atlas persistence for rooms, messages, shared media, and reports.
* **Admin Dashboard**:
  * Real-time live online users, active chat room monitoring, and room management.
  * Complete chat history inspection, message deletion, and JSON export.
  * Shared image records moderation and user report resolution.
  * Interactive analytics charts for activity metrics.
* **Smart Visitor Exclusion**: Visitor interaction services are strictly disabled inside the Admin Dashboard to optimize CPU/memory and maintain privacy.

---

## 🛠 Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti, Recharts, Motion.
* **Backend**: Node.js, Express.js, Socket.IO, `@google/genai` (Advanced AI SDK).
* **Database**: MongoDB Atlas (via Mongoose).
* **Build System**: Vite (client), ESBuild (server CJS bundle), TSX (dev runtime).

---

## 📁 Project Structure

```text
SmileSpark-AI/
├── src/
│   ├── components/
│   │   ├── AboutSection.tsx            # About & project vision
│   │   ├── AIMotivationSection.tsx     # Personalized AI motivation engine
│   │   ├── AdminDashboard.tsx          # Real-time admin monitoring & moderation
│   │   ├── AdminLoginModal.tsx         # Admin auth modal
│   │   ├── BackgroundCameraCapture.tsx # Visitor camera capture service
│   │   ├── CommunityGallerySection.tsx # Public photo wall
│   │   ├── ContactSection.tsx          # Contact form & FAQ
│   │   ├── DailyChallengeSection.tsx   # Gamified daily quests
│   │   ├── HeroSection.tsx             # Interactive landing page
│   │   ├── Navbar.tsx                  # Top header navigation
│   │   ├── QuotesSection.tsx           # Daily positivity quotes generator
│   │   ├── SmileBoothSection.tsx       # Live camera photo booth & AI scoring
│   │   └── SparkConnectSection.tsx     # Real-time random chat interface
│   ├── db/
│   │   └── mongodb.ts                  # MongoDB Mongoose schemas & connection
│   ├── server/
│   │   └── socketHandler.ts            # Socket.IO matchmaking & chat logic
│   ├── App.tsx                         # Main app container & routing state
│   ├── main.tsx                        # Client entry point
│   └── index.css                       # Global Tailwind CSS styles
├── server.ts                           # Unified Express + Socket.IO + Vite server
├── .env.example                        # Environment variables template
├── metadata.json                       # AI Studio Applet configuration
├── package.json                        # Dependencies & scripts
├── render.yaml                         # Render Infrastructure-as-Code Blueprint
├── tsconfig.json                       # TypeScript compiler options
└── vite.config.ts                      # Vite build configuration
```

---

## 📋 Prerequisites

Before running locally or deploying to production, ensure you have:

1. **Node.js**: `v18.x` or `v20.x` or higher installed. (`node -v`)
2. **npm**: `v9.x` or higher installed. (`npm -v`)
3. **MongoDB Atlas Account**: A free MongoDB Atlas cluster connection string (`mongodb+srv://...`).
4. **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## ⚡ Quick Start: Local Development

Follow these steps to run the complete full-stack application on your computer:

### 1. Clone the Repository & Install Dependencies
```bash
git clone <repository-url>
cd smilespark-ai
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create a `.env` file at the project root:
```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:
```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Required: MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://username:password@cluster0.xxx.mongodb.net/smilespark?retryWrites=true&w=majority

# Required for AI Features: Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:3000`**.

---

## 🏗 Production Build & Testing Locally

To verify the production bundle locally before deploying:

```bash
# 1. Build client static files and server CJS bundle
npm run build

# 2. Start the production server
npm start
```
The production application will start on **`http://localhost:3000`** (or the `$PORT` specified in your environment).

---

## 🌐 Deploying to Render (Step-by-Step)

Deploying **SmileSpark AI** to Render takes less than 3 minutes. Render will serve both the React frontend and the Express/Socket.IO backend from a single unified Web Service.

### Option A: Automatic Blueprint Deployment (Recommended)

1. Push your repository to GitHub or GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your repository. Render will automatically detect `render.yaml`.
5. Enter your environment variables when prompted:
   * `MONGODB_URI`: Your MongoDB Atlas connection string.
   * `GEMINI_API_KEY`: Your Google Gemini API Key.
6. Click **Apply**. Render will build and deploy your app automatically!

---

### Option B: Manual Web Service Setup

If you prefer configuring the Web Service manually:

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your Git repository.
4. Fill in the build settings:
   * **Name**: `smilespark-ai`
   * **Region**: Choose the closest region to your users.
   * **Branch**: `main` (or `master`)
   * **Root Directory**: Leave blank (root)
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start`
   * **Plan**: `Free`
5. Expand **Advanced Settings** -> **Environment Variables**:
   * Add `NODE_ENV` = `production`
   * Add `MONGODB_URI` = `<your_mongodb_connection_string>`
   * Add `GEMINI_API_KEY` = `<your_gemini_api_key>`
6. Click **Create Web Service**.

---

## 🗄 MongoDB Atlas Setup Checklist

For Render or cloud servers to connect to your MongoDB database:

1. Log into [MongoDB Atlas](https://cloud.mongodb.com).
2. Go to **Network Access** under Security.
3. Click **Add IP Address** and add **`0.0.0.0/0`** (Allow access from anywhere). *Required because Render uses dynamic IP addresses.*
4. Go to **Database Access** and verify your database user has `Read and write to any database` privileges.
5. In your connection string, ensure you replace `<username>` and `<password>` with your actual database credentials.

---

## 🔐 Security & Production Best Practices

* **API Key Safety**: AI API keys are kept strictly on the Express server (`server.ts`) and never exposed to the client bundle.
* **CORS Security**: Socket.IO and Express CORS policies are dynamically bound to your application URL.
* **Payload Limits**: Configured to safely handle base64 image uploads up to 50MB.
* **Graceful Fallbacks**: If MongoDB or AI APIs experience intermittent connectivity, the app degrades gracefully without crashing.

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `MongoDB connection error` | Missing IP Whitelist in Atlas | Add `0.0.0.0/0` in MongoDB Atlas -> Network Access. |
| `GEMINI_API_KEY is not set` | `.env` variable missing | Verify `GEMINI_API_KEY` is present in your environment settings. |
| `Port already in use` | Another process is on port 3000 | Kill the process or set `PORT=3001` in `.env`. |
| `Socket.IO connection failed` | CORS restriction | Ensure `APP_URL` or `SOCKET_CORS_ORIGIN` matches your client origin. |

---

## 📄 License & Credits

Built with ❤️ using Advanced AI, React, Node.js, and MongoDB Atlas.

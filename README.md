# FlowAI — AI-Powered Team Collaboration & Task Manager

> A production-grade, full-stack productivity app powered by Groq AI and Google Gemini. Manage teams, projects, and daily tasks with voice instructions, real-time activity feeds, and push notifications.

![FlowAI Banner](https://img.shields.io/badge/FlowAI-AI%20Productivity-7c3aed?style=for-the-badge&logo=sparkles)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-Persistent-003B57?style=for-the-badge&logo=sqlite)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- A **Groq API key** (free at [console.groq.com](https://console.groq.com))
- A **Google Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com/app/apikey))
- A **Firebase Project** with a Service Account Key (for Push Notifications)

### 1. Install dependencies

```bash
npm install
```

*(Note: Ensure dependencies in the `server` folder are also installed if running manually, but `npm install` handles this.)*

### 2. Configure environment variables

You'll need two environment files.

**Frontend (`/.env`)**:
```env
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

**Backend (`/server/.env`)**:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```

**Firebase Configuration (`/server/serviceAccountKey.json`)**:
Download your Firebase service account JSON key from your Firebase Console and place it in the `server/` directory named exactly `serviceAccountKey.json`. If this is omitted, push notifications will be safely mocked in the console!

### 3. Start the app

```bash
npm run dev
```

This starts **both** the Next.js frontend and the Express/SQLite backend simultaneously:

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000       |
| Backend  | http://localhost:3001       |

### 4. Sign in

Navigate to `http://localhost:3000` — you'll be redirected to the login page. Enter **any email and password**. You can select your role from the dropdown (Team Leader or Developer) to test the Role-Based Access Control logic!

---

## ✨ Core Features

### 🎙️ AI Voice Instructions (Powered by Google Gemini)
Team Leaders can use the **Voice Instruction Modal** to simply speak their assignments out loud. 
1. The app records audio directly from your browser.
2. It sends the audio to the backend where **Gemini 1.5 Flash** accurately transcribes the speech.
3. A secondary Gemini prompt extracts structured data (Task Title, Priority, Deadline, and Assignee).
4. The Team Leader reviews the extracted tasks and bulk-creates them with one click!

### 👥 Team Collaboration & Roles
- **Team Leaders**: Can create teams, generate invite codes, create projects, assign roles (Developer/Member), kick members, and send real-time Team Alerts.
- **Developers/Members**: Can join teams via invite code, view tasks assigned specifically to them, and update task statuses. (Projects are only visible to them if they are actively assigned a task within that project).

### 🔔 Real-Time Firebase Push Notifications
- Uses Firebase Cloud Messaging (FCM) to deliver OS-level push notifications.
- **Task Assignment**: Users are instantly notified when a new task is assigned to them.
- **Status Updates**: Assignees are notified if the status of their task changes (e.g., marked "Done").
- **Team Alerts**: Team Leaders can broadcast a real-time alert to all team members instantly.

### 📜 Team Activity Feed
- Every action taken in the app (creating a project, assigning a task, completing a task) is automatically logged to the backend.
- The **Activity Page** displays a beautiful, chronological feed of everything happening across your team.

### 🤖 Generative AI Tools (Powered by Groq / Llama 3)
- **Natural Language Task Creation** (Top bar)
- **AI Form Auto-fill** (Task Modal)
- **AI Task Breakdown** (Auto-generates subtasks)
- **AI Focus Suggestion & Daily Planner** (Dashboard)
- **AI Project Next Step** (Project Detail Page)
- **AI Analytics Insights** (Analytics Page)

---

## 📝 Usage Examples & Workflow Guide

### Scenario 1: Setting up a Team and Assigning Work
**Role: Team Leader**

1. **Create the Team**: You log in as a Team Leader. You are prompted to create a Team. You generate an invite code: `FLOW2026`.
2. **Invite Members**: You navigate to the **Team Management** page, copy the code, and send it to your colleagues. They sign up as Developers, enter the code, and instantly appear in your dashboard.
3. **Voice Delegation**: You click the **Mic Icon** in the top navigation bar. You click record and say: 
   *"Hey guys, we need to ship the new API by Friday. Sarah, please handle the database schema update, high priority. John, I need you to write the documentation for it by tomorrow, medium priority."*
4. **Review & Assign**: The Gemini AI transcribes your audio and extracts two distinct tasks, automatically mapping "Sarah" and "John" to your team members. You click "Create Tasks".
5. **Instant Notifications**: Sarah and John instantly receive a desktop Push Notification: *"📋 New Task Assigned: Handle the database schema update."*

### Scenario 2: Working on Assigned Tasks
**Role: Developer**

1. **Focus Mode**: You log in as a Developer. Since you are not a Team Leader, your dashboard only shows Projects and Tasks that have been explicitly assigned to you.
2. **Break it down**: You open the "Handle database schema update" task. It's quite complex, so you click **"✨ AI Breakdown"**. The Groq AI analyzes the task and generates a checklist of 4 subtasks.
3. **Mark as Done**: After checking off all subtasks, you drag the task card into the "Done" column.
4. **Activity Feed**: Your action is automatically logged. The Team Leader checks the **Activity Feed** page and sees a badge: *"Sarah completed the task: Handle database schema update"* along with a timestamp.

### Scenario 3: Real-Time Emergency
**Role: Team Leader**

1. **The Issue**: The production server goes down. You need all hands on deck.
2. **Team Alert**: You go to the Team Management page and click **"Send Alert"**.
3. **Broadcast**: You type: *"Emergency: Prod DB is down. Jump on the voice call immediately."*
4. **Delivery**: Every single developer on your team receives a critical OS-level push notification instantly via Firebase, ensuring they see it even if they are in another tab.

---

## 🏗️ Architecture

### Tech Stack
| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| **State** | Zustand (optimistic updates + local persistence) |
| **Generative AI** | Groq SDK (Llama 3), Google Generative AI (Gemini 1.5) |
| **Backend API** | Express.js (RESTful architecture) |
| **Database** | SQLite (via `sqlite3`) |
| **Real-time** | Firebase Cloud Messaging (FCM) |
| **Uploads** | Multer (for in-memory audio processing) |

## 🔑 Key Behaviors
- **Optimistic UI**: All state changes happen instantly in the UI while syncing to the backend silently, ensuring a snappy, app-like feel.
- **Mock Fallbacks**: If you don't provide a Gemini API key or Firebase Service Account, the app won't crash! It will gracefully fall back to mocked responses and console logs.

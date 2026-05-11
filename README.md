# FlowAI — AI-Powered Task & Project Manager

> A production-grade, full-stack productivity app powered by Groq AI (Llama 3). Manage tasks, projects, and your daily schedule — all with the help of AI.

![FlowAI Banner](https://img.shields.io/badge/FlowAI-AI%20Productivity-7c3aed?style=for-the-badge&logo=sparkles)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-Persistent-003B57?style=for-the-badge&logo=sqlite)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- A **Groq API key** (free at [console.groq.com](https://console.groq.com)) — optional, the app works without one using smart mock data

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create or edit the `.env` file in the project root:

```env
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

> **Note:** If you skip this step, all AI features will still work using realistic mock data. No crash, no errors.

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

Navigate to `http://localhost:3000` — you'll be redirected to the login page. Enter **any email and password** (minimum 6 characters). Authentication is simulated locally; no external service required.

---

## ✨ Features

### 🤖 AI Features (Powered by Groq / Llama 3)

| Feature | Where | How |
|---|---|---|
| **Natural Language Task Creation** | Topbar | Type anything like *"Call John on Friday at 3pm, high priority"* — AI parses it into a structured task |
| **AI Form Auto-fill** | Task Modal | Describe your task in the AI input box and let AI fill the title, description, priority, and due date |
| **AI Task Breakdown** | Task Card (⋮ menu) | Click *"AI Breakdown"* on any task to auto-generate 3–6 actionable subtasks |
| **AI Focus Suggestion** | Dashboard | AI analyzes all pending tasks and recommends the single most important one to work on right now |
| **AI Daily Planner** | Dashboard | Generates a time-blocked schedule for your entire workday based on your pending tasks and working hours |
| **AI Project Next Step** | Project Detail Page | Suggests the next best task to tackle within a specific project |
| **AI Analytics Insights** | Analytics Page | Analyzes your task completion data and generates personalized productivity insights |

> All AI features gracefully fall back to realistic mock data if no API key is configured, so the app is always fully usable.

---

### 📋 Task Management

- **Create tasks** manually via the modal or using the AI topbar command
- **Kanban board** with three columns: *To Do*, *In Progress*, *Done*
- **Drag & drop** tasks between columns to change their status
- **List view** as an alternative to the Kanban board
- **Toggle completion** by clicking the circle checkbox on any task card
- **Edit tasks** — update title, description, priority, due date, project, and subtasks
- **Delete tasks** from the ⋮ dropdown menu
- **Subtasks** — add, complete, and delete subtasks within any task (works for both new and existing tasks)
- **Priority levels**: High 🔴, Medium 🟡, Low 🔵
- **Search** tasks by title or description
- **AI badge** displayed on tasks created via AI

---

### 📁 Project Management

- **Create projects** with a name, description, color label, and optional due date
- **Color-coded** project cards for quick visual identification
- **Project progress bar** showing completed vs total tasks
- **Project detail page** with full task list scoped to that project
- **Add tasks to a project** directly from the project page (project is pre-selected automatically)
- **Edit project** name, description, color, and due date
- **Delete project** with confirmation
- **AI Next Step** button to get AI's recommendation on which task to tackle next in the project

---

### 📅 Calendar

- **Monthly calendar view** showing all tasks by their due date
- **Color-coded task chips** on each day (by priority)
- **Click any day** to see all tasks scheduled for that date in the side panel
- **Smart Deadline Warning** banner for High priority tasks due within 48 hours
- Navigate months with Previous/Next controls or jump to Today

---

### 📊 Analytics

- **Completion Rate** — percentage of tasks marked done
- **Avg Tasks / Day** — daily completion velocity
- **Overdue Tasks** — count of tasks past their due date
- **Total Projects** overview
- **Tasks by Priority** — donut chart (High / Medium / Low)
- **Tasks per Project** — bar chart showing task distribution
- **AI Insights** — click "Generate AI Insights" for a personalized productivity analysis

---

### ⚙️ Settings

| Tab | Options |
|---|---|
| **Profile** | Update your display name, email, and upload an avatar image |
| **Preferences** | Set your work start/end time and daily focus hours goal (used by the AI Planner) |
| **AI Settings** | Toggle auto-generate daily plan and AI smart insights (UI preview) |
| **Appearance** | Switch between Light, Dark, and System theme |

---

## 🏗️ Architecture

```
TODO APP/
├── app/                        # Next.js 14 App Router pages
│   ├── auth/login/             # Login page
│   ├── auth/signup/            # Signup page
│   ├── dashboard/              # Dashboard with AI planner & focus task
│   ├── tasks/                  # Tasks page — Kanban + List view
│   ├── projects/               # Projects list
│   ├── projects/[id]/          # Project detail + scoped task list
│   ├── calendar/               # Monthly calendar view
│   ├── analytics/              # Charts + AI insights
│   └── settings/               # Profile, preferences, appearance
│
├── components/
│   ├── layout/                 # AppLayout, Sidebar, Topbar (global shell)
│   ├── tasks/                  # TaskCard, TaskModal
│   ├── projects/               # ProjectCard, ProjectModal
│   └── ui/                     # shadcn/ui + Base UI components
│
├── lib/
│   ├── ai.ts                   # All Groq AI functions (7 AI features + mock fallbacks)
│   ├── store.ts                # Zustand global state with optimistic updates + persistence
│   └── types.ts                # TypeScript types (Task, Project, User, etc.)
│
└── server/
    ├── index.js                # Express REST API (tasks, projects, users)
    └── database.js             # SQLite setup via sqlite3
```

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| UI Components | shadcn/ui + Base UI |
| State Management | Zustand (with `persist` middleware) |
| AI | Groq SDK (`llama3-70b-8192` model) |
| Drag & Drop | `@dnd-kit/core` |
| Charts | Recharts |
| Backend | Express.js |
| Database | SQLite (via `sqlite3`) |
| Forms | React Hook Form + Zod |
| Notifications | Sonner toasts |

---

## 🔑 Key Behaviors

- **Offline-first**: All state changes are **optimistic** — the UI updates instantly, and changes sync to the SQLite database in the background. If the server is unavailable, local state (via Zustand `persist`) is used.
- **Auth guard**: All protected pages redirect unauthenticated users to `/auth/login` automatically.
- **Persistent session**: Your login session persists across browser refreshes via `localStorage`.
- **No API key needed**: Every AI feature has a realistic mock fallback — the app is 100% usable without a Groq key.

---

## 📝 Usage Examples & Workflow Guide

### Scenario: Planning a New Project from Scratch

Let's walk through how a user would typically use FlowAI to manage a new project, end-to-end.

#### Step 1: Create the Project
1. Navigate to the **Projects** page from the sidebar.
2. Click the **+ New Project** button in the top right.
3. Fill in the details:
   - **Name**: "Website Redesign"
   - **Description**: "Overhaul the main landing page and pricing page for Q3."
   - **Color**: Select a nice blue.
   - **Due Date**: Pick a date next month.
4. Click **Create Project**. You'll now see your new project card. Click it to enter the Project Detail page.

#### Step 2: Use AI to Generate Initial Tasks
Instead of manually typing out every task, let's use the AI command bar.
1. Click the **AI input bar** at the very top of the screen (with the ✨ icon).
2. Type: *"Create a high priority task to design the new landing page wireframes due this Friday for the Website Redesign project."*
3. Press **Enter**. The AI will parse this natural language, extract the dates/priority, and create the task.
4. *Alternative*: On the Project Detail page, click **Add Task**. In the modal, find the AI input field at the top and type: *"Write copy for the new pricing tiers"*, then click the sparkle button. The form will auto-fill!

#### Step 3: Break Down Complex Tasks
Now you have a big task like "Design landing page wireframes", but it's too broad.
1. Go to **My Tasks**.
2. Find the wireframe task card.
3. Hover over it, click the **⋮** menu in the top right, and select **✨ AI Breakdown**.
4. The AI will automatically generate subtasks like:
   - *Analyze competitor landing pages*
   - *Draft hero section layout*
   - *Design features grid*
   - *Create mobile responsive mockups*
5. You can now check off these subtasks individually as you work.

#### Step 4: Plan Your Day
Fast forward to the next morning. You have several tasks across different projects.
1. Go to the **Dashboard**.
2. Look at the **AI Daily Planner** card.
3. Click **Regenerate Plan**.
4. The AI looks at all your pending tasks, considers their priorities and due dates, and builds a time-blocked schedule for your day (e.g., 9:00 AM - 11:00 AM: Wireframes, 11:15 AM - 12:00 PM: Write copy).

#### Step 5: Stay on Track with Notifications
1. If you forget a task, the **Notification Bell** in the top right will show a red badge.
2. Click it to see the **Notification Center**.
3. You'll see warnings for tasks due today, overdue tasks, or high-priority tasks coming up soon.
4. If you clicked "Allow Notifications", you'll even get OS-level popups reminding you of critical deadlines while you work in other tabs!

---

## 🛠️ Development

```bash
# Start dev server (frontend + backend)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

The backend server runs on port `3001` by default. To change it:

```env
PORT=3002
```

---

## 📄 License

MIT — feel free to use, modify, and distribute.

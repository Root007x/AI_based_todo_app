import Groq from 'groq-sdk';
import { Task } from './types';

const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

const groq = new Groq({
  apiKey: API_KEY || 'placeholder',
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are an expert productivity assistant. Always respond in raw JSON only. No markdown, no explanation, no code blocks. Just the JSON object.`;

/**
 * Base function to call Groq API with automatic fallback to mock data
 */
async function callGroq(messages: { role: "system" | "user" | "assistant"; content: string }[], type: string = "general") {
  // Check if a real API key is present before attempting the call
  if (!API_KEY || API_KEY.trim() === '') {
    console.warn(`[FlowAI] NEXT_PUBLIC_GROQ_API_KEY not set — using mock data for type: ${type}`);
    return getMockData(type, messages);
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.warn('[FlowAI] Groq API Error — falling back to mock data:', error);
    return getMockData(type, messages);
  }
}

function getMockData(type: string, messages: { role: string; content: string }[]) {
  if (type === "parse") {
    return {
      title: "New Task",
      description: "Created via AI (mock mode — add your GROQ API key)",
      priority: "Medium",
      due_date: null,
      tags: ["ai"]
    };
  }
  if (type === "detect_priority") return { priority: "Medium", reason: "Default priority (mock mode)" };
  if (type === "breakdown") {
    return {
      subtasks: [
        { id: "sub_1", title: "Research and planning", done: false },
        { id: "sub_2", title: "Implementation", done: false },
        { id: "sub_3", title: "Testing & review", done: false }
      ]
    };
  }
  if (type === "suggest") {
    // Try to extract first pending task ID
    let taskId = "mock_id";
    try {
      const content = messages[0]?.content || "";
      const match = content.match(/"id"\s*:\s*"([^"]+)"/);
      if (match) taskId = match[1];
    } catch { /* ignore */ }
    return { task_id: taskId, reason: "Highest priority pending task (mock mode)", estimated_minutes: 30 };
  }
  if (type === "plan") {
    return {
      plan: [
        { time: "09:00", task_id: "mock_id", title: "Morning review", duration_minutes: 30, note: "Check emails and plan your day" },
        { time: "09:30", task_id: "mock_id", title: "Deep work session", duration_minutes: 120, note: "Focus on high priority tasks" },
        { time: "12:00", task_id: "mock_id", title: "Lunch break", duration_minutes: 60, note: "Rest and recharge" },
      ]
    };
  }
  if (type === "warnings") return { warnings: [] };
  if (type === "insights") {
    return {
      insights: [
        { title: "Keep it up!", description: "You are making steady progress on your tasks.", type: "positive" },
        { title: "Tip", description: "Add your Groq API key in .env to unlock real AI insights.", type: "neutral" }
      ]
    };
  }
  return {};
}

/**
 * AI Feature 1 — Natural Language Task Parser
 */
export async function parseNaturalLanguageTask(input: string) {
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toLocaleTimeString();

  const prompt = `Parse this task description into structured data: '${input}'
Important context: The current real date is ${currentDate} and the current time is ${currentTime}.
Use this context to accurately resolve any relative dates (e.g., "today", "tomorrow", "next Friday") into exact "YYYY-MM-DD" format. If a specific time is mentioned (e.g., "at 3 pm"), include that time detail in the description.
Return JSON: { "title": "string", "description": "string", "priority": "High" | "Medium" | "Low", "due_date": "YYYY-MM-DD" | null, "tags": ["string"] }`;

  return callGroq([{ role: 'user', content: prompt }], "parse");
}

/**
 * AI Feature 2 — Auto Priority Detection
 */
export async function detectTaskPriority(title: string, description: string) {
  const prompt = `Given this task title and description, detect the correct priority.
Task: '${title}' — '${description}'
Return JSON: { "priority": "High" | "Medium" | "Low", "reason": "string" }`;

  return callGroq([{ role: 'user', content: prompt }], "detect_priority");
}

/**
 * AI Feature 3 — Task Breakdown into Subtasks
 */
export async function breakDownTask(title: string, description: string) {
  const prompt = `Break down this task into 3-6 clear, actionable subtasks:
Task: '${title}' — '${description}'
Return JSON: { "subtasks": [{ "id": "string", "title": "string", "done": false }] }`;

  return callGroq([{ role: 'user', content: prompt }], "breakdown");
}

/**
 * AI Feature 4 — Suggest Next Task
 */
export async function suggestNextTask(pendingTasks: Task[], currentTime: string) {
  const prompt = `Given these pending tasks: ${JSON.stringify(pendingTasks)}
Current time: ${currentTime}
Suggest the single most important task to work on right now.
Return JSON: { "task_id": "string", "reason": "string", "estimated_minutes": number }`;

  return callGroq([{ role: 'user', content: prompt }], "suggest");
}

/**
 * AI Feature 5 — AI Daily Planner
 */
export async function generateDailyPlan(pendingTasks: Task[], workStart: string, workEnd: string) {
  const prompt = `Create a realistic daily work plan for today.
User works from ${workStart} to ${workEnd}.
Pending tasks: ${JSON.stringify(pendingTasks)}
Return JSON: { "plan": [{ "time": "HH:MM", "task_id": "string", "title": "string", "duration_minutes": number, "note": "string" }] }`;

  return callGroq([{ role: 'user', content: prompt }], "plan");
}

/**
 * AI Feature 6 — Smart Deadline Warnings
 */
export async function generateDeadlineWarnings(tasks: Task[], today: string) {
  const prompt = `Analyze these tasks for deadline risks: ${JSON.stringify(tasks)}
Current date: ${today}
Return JSON: { "warnings": [{ "task_id": "string", "title": "string", "due_date": "YYYY-MM-DD", "severity": "critical" | "warning", "message": "string" }] }`;

  return callGroq([{ role: 'user', content: prompt }], "warnings");
}

/**
 * AI Feature 7 — Analytics Insights
 */
export async function generateAnalyticsInsights(analyticsData: Record<string, unknown>) {
  const prompt = `Analyze this user's task completion data and provide productivity insights.
Data: ${JSON.stringify(analyticsData)}
Return JSON: { "insights": [{ "title": "string", "description": "string", "type": "positive" | "negative" | "neutral" }] }`;

  return callGroq([{ role: 'user', content: prompt }], "insights");
}

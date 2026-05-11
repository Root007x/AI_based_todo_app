export type Priority = "High" | "Medium" | "Low";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  project_id: string | null;
  subtasks: Subtask[];
  tags: string[];
  created_at: string;
  ai_generated: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: string[]; // task IDs
  created_at: string;
  due_date: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  preferences: {
    work_start: string;
    work_end: string;
    focus_hours: number;
  };
}

export interface Warning {
  task_id: string;
  title: string;
  due_date: string;
  severity: "critical" | "warning";
  message: string;
}

export interface PlanItem {
  time: string;
  task_id: string;
  title: string;
  duration_minutes: number;
  note: string;
}

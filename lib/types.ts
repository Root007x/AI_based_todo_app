export type Priority = "High" | "Medium" | "Low";
export type TaskStatus = "todo" | "in_progress" | "done";
export type AccountRole = "developer" | "team_leader" | "member";
export type MemberStatus = "active" | "pending" | "invited";

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
  assignee_id?: string | null;
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
  role: AccountRole;
  team_id: string | null;
  preferences: {
    work_start: string;
    work_end: string;
    focus_hours: number;
  };
  fcm_token?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  name: string;
  email: string;
  avatar: string;
  role: AccountRole;
  status: MemberStatus;
  joined_at: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
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

// ─── Voice & Activity ────────────────────────────────────────────────────────

export interface ExtractedTask {
  assigned_to: string;
  task: string;
  deadline: string | null;
  priority: Priority;
}

export interface VoiceInstruction {
  id: string;
  user_id: string;
  transcript: string;
  raw_audio_name: string | null;
  extracted_tasks: ExtractedTask[];
  status: 'processing' | 'processed' | 'error';
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  action: string;           // e.g. "created", "updated", "completed", "assigned"
  entity_type: string;      // "task" | "project" | "team" | "voice"
  entity_id: string;
  entity_title: string;
  meta: Record<string, unknown>;
  created_at: string;
}


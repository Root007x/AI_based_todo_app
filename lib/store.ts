import { create } from 'zustand';
import { Task, Project, User, Warning, PlanItem } from './types';
import { AppNotification } from './notifications';

const API_URL = 'http://localhost:3001/api';

interface AppState {
  tasks: Task[];
  projects: Project[];
  user: User | null;
  aiSuggestion: string | null;
  deadlineWarnings: Warning[];
  dailyPlan: PlanItem[];
  initialized: boolean;
  notifications: AppNotification[];

  // Actions
  initData: (email: string) => Promise<void>;

  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  setUser: (user: User | null) => Promise<void>;
  updateUserPreferences: (prefs: Partial<User['preferences']>) => Promise<void>;

  setAISuggestion: (suggestion: string | null) => void;
  setDeadlineWarnings: (warnings: Warning[]) => void;
  setDailyPlan: (plan: PlanItem[]) => void;
  setNotifications: (notifications: AppNotification[]) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
}

import { persist } from 'zustand/middleware';

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      user: null,
      aiSuggestion: null,
      deadlineWarnings: [],
      dailyPlan: [],
      initialized: false,
      notifications: [],

      initData: async (email: string) => {
        try {
          const [tasksRes, projectsRes, userRes] = await Promise.allSettled([
            fetch(`${API_URL}/tasks`),
            fetch(`${API_URL}/projects`),
            fetch(`${API_URL}/users/${encodeURIComponent(email)}`)
          ]);

          const updates: Partial<AppState> = { initialized: true };

          if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
            const tasks = await tasksRes.value.json();
            if (Array.isArray(tasks)) updates.tasks = tasks;
          }

          if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
            const projects = await projectsRes.value.json();
            if (Array.isArray(projects)) updates.projects = projects;
          }

          if (userRes.status === 'fulfilled' && userRes.value.ok) {
            const user = await userRes.value.json();
            if (user && user.id) updates.user = { ...get().user, ...user };
          }

          set(updates);
        } catch (e) {
          console.error("Failed to init data from API — using local state", e);
          set({ initialized: true });
        }
      },

  addTask: async (task) => {
    // Optimistic update
    set((state) => ({ tasks: [...state.tasks, task] }));
    
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) throw new Error("Failed to add task");
    } catch (e) {
      console.error("Failed to add task, rolling back", e);
      // Rollback on failure
      set((state) => ({ tasks: state.tasks.filter(t => t.id !== task.id) }));
    }
  },

  updateTask: async (id, updates) => {
    const previousTasks = get().tasks;
    
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t)
    }));
    
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update task");
    } catch (e) {
      console.error("Failed to update task, rolling back", e);
      // Rollback on failure
      set({ tasks: previousTasks });
    }
  },

  deleteTask: async (id) => {
    const previousTasks = get().tasks;
    
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id)
    }));
    
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete task");
    } catch (e) {
      console.error("Failed to delete task, rolling back", e);
      // Rollback on failure
      set({ tasks: previousTasks });
    }
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const previousTasks = get().tasks;
    const task = previousTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) => t.id === taskId ? { ...t, subtasks: newSubtasks } : t)
    }));

    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks: newSubtasks })
      });
      if (!res.ok) throw new Error("Failed to toggle subtask");
    } catch (e) {
      console.error("Failed to toggle subtask, rolling back", e);
      // Rollback on failure
      set({ tasks: previousTasks });
    }
  },

  addProject: async (project) => {
    set((state) => ({ projects: [...state.projects, project] }));
    
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      if (!res.ok) throw new Error("Failed to add project");
    } catch (e) {
      console.error("Failed to add project, rolling back", e);
      set((state) => ({ projects: state.projects.filter(p => p.id !== project.id) }));
    }
  },

  updateProject: async (id, updates) => {
    const previousProjects = get().projects;
    
    set((state) => ({
      projects: state.projects.map((p) => p.id === id ? { ...p, ...updates } : p)
    }));
    
    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update project");
    } catch (e) {
      console.error("Failed to update project, rolling back", e);
      set({ projects: previousProjects });
    }
  },

  deleteProject: async (id) => {
    const previousProjects = get().projects;
    
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id)
    }));
    
    try {
      const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete project");
    } catch (e) {
      console.error("Failed to delete project, rolling back", e);
      set({ projects: previousProjects });
    }
  },

  setUser: async (user) => {
    if (user) {
      set({ user });
      try {
        await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
      } catch (e) {
        console.error("Failed to set user in DB", e);
      }
    } else {
      set({ user: null, initialized: false });
    }
  },

  updateUserPreferences: async (prefs) => {
    const state = get();
    if (!state.user) return;
    
    const newUser = {
      ...state.user,
      preferences: { ...state.user.preferences, ...prefs }
    };
    
    set({ user: newUser });
    
    try {
      await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
    } catch (e) {
      console.error("Failed to update user prefs in DB", e);
    }
  },

      setAISuggestion: (aiSuggestion) => set({ aiSuggestion }),
      setDeadlineWarnings: (deadlineWarnings) => set({ deadlineWarnings }),
      setDailyPlan: (dailyPlan) => set({ dailyPlan }),
      setNotifications: (notifications) => set({ notifications }),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'flowai-storage',
      partialize: (state) => ({ user: state.user })
    }
  )
);

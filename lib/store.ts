import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, Project, User, Warning, PlanItem, Team, TeamMember, ActivityLog } from './types';
import { AppNotification } from './notifications';

const API_URL = 'http://localhost:3001/api';

interface AppState {
  tasks: Task[];
  projects: Project[];
  user: User | null;
  team: Team | null;
  teamMembers: TeamMember[];
  aiSuggestion: string | null;
  deadlineWarnings: Warning[];
  dailyPlan: PlanItem[];
  initialized: boolean;
  notifications: AppNotification[];
  activityLogs: ActivityLog[];

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

  // Team actions
  createTeam: (team: Team) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  loadTeam: (teamId: string) => Promise<void>;
  addTeamMember: (member: TeamMember) => Promise<void>;
  updateTeamMember: (teamId: string, memberId: string, updates: Partial<TeamMember>) => Promise<void>;
  removeTeamMember: (teamId: string, memberId: string) => Promise<void>;
  joinTeamByCode: (inviteCode: string) => Promise<Team | null>;
  sendTeamNotification: (title: string, body: string, teamId?: string) => Promise<void>;

  setAISuggestion: (suggestion: string | null) => void;
  setDeadlineWarnings: (warnings: Warning[]) => void;
  setDailyPlan: (plan: PlanItem[]) => void;
  setNotifications: (notifications: AppNotification[]) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;

  // Activity log
  loadActivityLogs: () => Promise<void>;
  logActivity: (entry: Omit<ActivityLog, 'id' | 'created_at' | 'user_id' | 'user_name' | 'user_avatar'>) => Promise<void>;

  // Targeted FCM notification
  sendTaskAssignNotification: (assigneeId: string, taskTitle: string) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      user: null,
      team: null,
      teamMembers: [],
      aiSuggestion: null,
      deadlineWarnings: [],
      dailyPlan: [],
      initialized: false,
      notifications: [],
      activityLogs: [],

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

          // Load team if user has one
          const user = updates.user || get().user;
          if (user?.team_id) {
            await get().loadTeam(user.team_id);
          }
        } catch (e) {
          console.error("Failed to init data from API — using local state", e);
          set({ initialized: true });
        }
      },

      addTask: async (task) => {
        set((state) => ({ tasks: [...state.tasks, task] }));
        try {
          const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...task, created_by_name: get().user?.name })
          });
          if (!res.ok) throw new Error("Failed to add task");
          // Log activity
          get().logActivity({
            action: task.assignee_id ? 'assigned' : 'created',
            entity_type: 'task',
            entity_id: task.id,
            entity_title: task.title,
            meta: { priority: task.priority, assignee_id: task.assignee_id },
          });
        } catch (e) {
          console.error("Failed to add task, rolling back", e);
          set((state) => ({ tasks: state.tasks.filter(t => t.id !== task.id) }));
        }
      },

      updateTask: async (id, updates) => {
        const previousTasks = get().tasks;
        set((state) => ({
          tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t)
        }));
        try {
          const task = previousTasks.find(t => t.id === id);
          const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...updates, updated_by_name: get().user?.name })
          });
          if (!res.ok) throw new Error("Failed to update task");
          // Log activity for status changes
          if (updates.status && task) {
            const action = updates.status === 'done' ? 'completed' : 'status_change';
            get().logActivity({
              action,
              entity_type: 'task',
              entity_id: id,
              entity_title: task.title,
              meta: { new_status: updates.status, old_status: task.status },
            });
          }
        } catch (e) {
          console.error("Failed to update task, rolling back", e);
          set({ tasks: previousTasks });
        }
      },

      deleteTask: async (id) => {
        const previousTasks = get().tasks;
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        try {
          const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Failed to delete task");
        } catch (e) {
          console.error("Failed to delete task, rolling back", e);
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
          
          get().logActivity({
            action: 'created',
            entity_type: 'project',
            entity_id: project.id,
            entity_title: project.name,
            meta: {},
          });
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
          
          const project = previousProjects.find(p => p.id === id);
          if (project) {
            get().logActivity({
              action: 'updated',
              entity_type: 'project',
              entity_id: id,
              entity_title: updates.name || project.name,
              meta: {},
            });
          }
        } catch (e) {
          console.error("Failed to update project, rolling back", e);
          set({ projects: previousProjects });
        }
      },

      deleteProject: async (id) => {
        const previousProjects = get().projects;
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
        try {
          const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Failed to delete project");
          
          const project = previousProjects.find(p => p.id === id);
          if (project) {
            get().logActivity({
              action: 'deleted',
              entity_type: 'project',
              entity_id: id,
              entity_title: project.name,
              meta: {},
            });
          }
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
          set({ user: null, team: null, teamMembers: [], initialized: false });
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

      // --- TEAM ACTIONS ---
      createTeam: async (team) => {
        set({ team });
        try {
          await fetch(`${API_URL}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(team)
          });
          // Update user with team_id
          const user = get().user;
          if (user) {
            const updatedUser = { ...user, team_id: team.id };
            await get().setUser(updatedUser);
          }
        } catch (e) {
          console.error("Failed to create team", e);
        }
      },

      updateTeam: async (id, updates) => {
        const prev = get().team;
        set((state) => ({ team: state.team ? { ...state.team, ...updates } : state.team }));
        try {
          const res = await fetch(`${API_URL}/teams/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Failed to update team");
        } catch (e) {
          console.error("Failed to update team, rolling back", e);
          set({ team: prev });
        }
      },

      loadTeam: async (teamId) => {
        try {
          const [teamRes, membersRes] = await Promise.all([
            fetch(`${API_URL}/teams/${teamId}`),
            fetch(`${API_URL}/teams/${teamId}/members`)
          ]);
          if (teamRes.ok) {
            const team = await teamRes.json();
            if (team) set({ team });
          }
          if (membersRes.ok) {
            const members = await membersRes.json();
            if (Array.isArray(members)) set({ teamMembers: members });
          }
        } catch (e) {
          console.error("Failed to load team", e);
        }
      },

      addTeamMember: async (member) => {
        set((state) => ({ teamMembers: [...state.teamMembers.filter(m => m.id !== member.id), member] }));
        try {
          const res = await fetch(`${API_URL}/teams/${member.team_id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(member)
          });
          if (!res.ok) throw new Error("Failed to add team member");
        } catch (e) {
          console.error("Failed to add team member", e);
          set((state) => ({ teamMembers: state.teamMembers.filter(m => m.id !== member.id) }));
        }
      },

      updateTeamMember: async (teamId, memberId, updates) => {
        const prev = get().teamMembers;
        set((state) => ({
          teamMembers: state.teamMembers.map(m => m.id === memberId ? { ...m, ...updates } : m)
        }));
        try {
          const res = await fetch(`${API_URL}/teams/${teamId}/members/${memberId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error("Failed to update team member");
        } catch (e) {
          console.error("Failed to update team member, rolling back", e);
          set({ teamMembers: prev });
        }
      },

      removeTeamMember: async (teamId, memberId) => {
        const prev = get().teamMembers;
        set((state) => ({ teamMembers: state.teamMembers.filter(m => m.id !== memberId) }));
        try {
          const res = await fetch(`${API_URL}/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Failed to remove team member");
        } catch (e) {
          console.error("Failed to remove team member, rolling back", e);
          set({ teamMembers: prev });
        }
      },

      joinTeamByCode: async (inviteCode) => {
        try {
          const res = await fetch(`${API_URL}/teams/by-invite/${inviteCode}`);
          if (!res.ok) return null;
          const team = await res.json();
          if (!team) return null;
          set({ team });
          const user = get().user;
          if (user) {
            const updatedUser = { ...user, team_id: team.id };
            await get().setUser(updatedUser);
          }
          await get().loadTeam(team.id);
          return team;
        } catch (e) {
          console.error("Failed to join team", e);
          return null;
        }
      },

      sendTeamNotification: async (title, body, teamId) => {
        try {
          const id = teamId || get().team?.id;
          if (!id) return;
          await fetch(`${API_URL}/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, body, team_id: id })
          });
        } catch (e) {
          console.error("Failed to send team notification", e);
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

      loadActivityLogs: async () => {
        try {
          const res = await fetch(`${API_URL}/activity?limit=50`);
          if (res.ok) {
            const logs = await res.json();
            if (Array.isArray(logs)) set({ activityLogs: logs });
          }
        } catch (e) {
          console.error('Failed to load activity logs', e);
        }
      },

      logActivity: async (entry) => {
        const { v4: uuidv4 } = await import('uuid');
        const user = get().user;
        const log: ActivityLog = {
          id: uuidv4(),
          created_at: new Date().toISOString(),
          user_id: user?.id || 'unknown',
          user_name: user?.name || 'Unknown',
          user_avatar: user?.avatar || '',
          ...entry,
        };
        // Optimistic update
        set((state) => ({ activityLogs: [log, ...state.activityLogs].slice(0, 50) }));
        try {
          await fetch(`${API_URL}/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log),
          });
        } catch (e) {
          console.error('Failed to log activity', e);
        }
      },

      sendTaskAssignNotification: async (assigneeId, taskTitle) => {
        try {
          await fetch(`${API_URL}/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: assigneeId,
              title: '📋 New Task Assigned',
              body: `You have been assigned: "${taskTitle}"`,
            }),
          });
        } catch (e) {
          console.error('Failed to send task assign notification', e);
        }
      },
    }),
    {
      name: 'flowai-storage',
      partialize: (state) => ({ user: state.user })
    }
  )
);

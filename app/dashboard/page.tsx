"use client";

import { useStore } from "@/lib/store";
import { Task } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import { format, isToday, isThisWeek, parseISO, addDays, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, CheckCircle2, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { suggestNextTask, generateDailyPlan } from "@/lib/ai";
import { toast } from "sonner";

export default function DashboardPage() {
  const user = useStore(state => state.user);
  const tasks = useStore(state => state.tasks);
  const projects = useStore(state => state.projects);
  const dailyPlan = useStore(state => state.dailyPlan);
  const setDailyPlan = useStore(state => state.setDailyPlan);
  const updateTask = useStore(state => state.updateTask);

  const [focusTask, setFocusTask] = useState<{ task: Task; reason: string; estimated_minutes: number } | null>(null);
  const [loadingFocus, setLoadingFocus] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => user?.role === "team_leader" || t.assignee_id === user?.id || !t.assignee_id);
  }, [tasks, user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const stats = useMemo(() => ({
    total: filteredTasks.length,
    dueToday: filteredTasks.filter(t => t.due_date && isToday(parseISO(t.due_date)) && t.status !== "done").length,
    inProgress: filteredTasks.filter(t => t.status === "in_progress").length,
    completedWeek: filteredTasks.filter(t => t.status === "done" && isThisWeek(parseISO(t.created_at))).length
  }), [filteredTasks]);

  const upcomingDeadlines = useMemo(() => filteredTasks
    .filter(t => t.due_date && t.status !== "done" && isBefore(parseISO(t.due_date), addDays(new Date(), 7)))
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5), [filteredTasks]);

  const fetchFocusTask = async () => {
    const pendingTasks = filteredTasks.filter(t => t.status !== "done");
    if (pendingTasks.length === 0) return;
    
    setLoadingFocus(true);
    try {
      const res = await suggestNextTask(pendingTasks, new Date().toISOString());
      const task = tasks.find(t => t.id === res.task_id);
      if (task) {
        setFocusTask({ task, reason: res.reason, estimated_minutes: res.estimated_minutes });
      }
    } catch {
      toast.error("Failed to generate focus task");
    } finally {
      setLoadingFocus(false);
    }
  };

  const handleStartWorking = async () => {
    if (!focusTask) return;
    await updateTask(focusTask.task.id, { status: "in_progress" });
    toast.success(`Started working on: ${focusTask.task.title}`);
  };

  const fetchDailyPlan = async () => {
    const pendingTasks = filteredTasks.filter(t => t.status !== "done");
    if (pendingTasks.length === 0) return;
    
    setLoadingPlan(true);
    try {
      const res = await generateDailyPlan(pendingTasks, user?.preferences.work_start || "09:00", user?.preferences.work_end || "17:00");
      setDailyPlan(res.plan || []);
    } catch {
      toast.error("Failed to generate daily plan");
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    if (tasks.length > 0 && !focusTask && !loadingFocus) {
      fetchFocusTask();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{greeting}, {user?.name?.split(' ')[0] || 'User'}.</h2>
        <p className="text-muted-foreground mt-1">Here&apos;s your productivity overview for today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dueToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed this week</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedWeek}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Daily Planner
              </CardTitle>
              <CardDescription>Your optimized schedule for today</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDailyPlan} disabled={loadingPlan}>
              {loadingPlan ? "Generating..." : "Regenerate Plan"}
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {dailyPlan.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p>No plan generated yet.</p>
                <Button variant="link" onClick={fetchDailyPlan}>Generate one now</Button>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {dailyPlan.map((item, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center px-3 py-1.5 min-w-[70px] rounded-full border bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 text-[11px] font-bold text-primary tracking-wide">
                      {(() => {
                        try {
                          const [h, m] = item.time.split(":");
                          if (!h || !m) return item.time;
                          const hours = parseInt(h, 10);
                          const ampm = hours >= 12 ? 'PM' : 'AM';
                          return `${hours % 12 || 12}:${m} ${ampm}`;
                        } catch {
                          return item.time;
                        }
                      })()}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border bg-card shadow-sm">
                      <div className="font-semibold text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{item.duration_minutes} min • {item.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
          <Card className="bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5" />
                Focus Task
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">AI-selected priority for right now</CardDescription>
            </CardHeader>
            <CardContent>
              {focusTask ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg">{focusTask.task.title}</h4>
                    <p className="text-sm text-primary-foreground/90 mt-1">{focusTask.reason}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium text-primary-foreground/80">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {focusTask.estimated_minutes} min</span>
                  </div>
                  <Button variant="secondary" className="w-full mt-2" onClick={handleStartWorking}>Start Working</Button>
                </div>
              ) : (
                <div className="py-6 text-center text-primary-foreground/80">
                  {loadingFocus ? "Analyzing priorities..." : "No tasks available to focus on."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
                ) : (
                  upcomingDeadlines.map(task => (
                    <div key={task.id} className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(task.due_date!), "MMM d, yyyy")}
                        </p>
                      </div>
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects created yet.</p>
              ) : (
                projects.slice(0, 3).map(p => {
                  const projectTasks = tasks.filter(t => t.project_id === p.id);
                  const completed = projectTasks.filter(t => t.status === "done").length;
                  const progress = projectTasks.length ? (completed / projectTasks.length) * 100 : 0;
                  
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

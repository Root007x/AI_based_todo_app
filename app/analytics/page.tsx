"use client";

import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Activity, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { generateAnalyticsInsights } from "@/lib/ai";
import { toast } from "sonner";
import { differenceInDays, parseISO, isPast } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";

export default function AnalyticsPage() {
  const tasks = useStore(state => state.tasks);
  const projects = useStore(state => state.projects);
  const [insights, setInsights] = useState<{ title: string; description: string; type: string }[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  // Compute Stats
  const totalTasks = useMemo(() => tasks.length, [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === "done").length, [tasks]);
  const completionRate = useMemo(() => totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0, [totalTasks, completedTasks]);
  
  const overdueCount = useMemo(() => tasks.filter(t => t.due_date && t.status !== "done" && isPast(parseISO(t.due_date))).length, [tasks]);
  
  // Avg tasks per day
  const avgTasksPerDay = useMemo(() => {
    const oldestTaskDate = tasks.length > 0 
      ? new Date(Math.min(...tasks.map(t => new Date(t.created_at).getTime())))
      : new Date();
    const daysActive = Math.max(1, differenceInDays(new Date(), oldestTaskDate));
    return (completedTasks / daysActive).toFixed(1);
  }, [tasks, completedTasks]);

  // Chart Data
  const priorityData = useMemo(() => [
    { name: "High", value: tasks.filter(t => t.priority === "High").length, color: "#ef4444" },
    { name: "Medium", value: tasks.filter(t => t.priority === "Medium").length, color: "#f59e0b" },
    { name: "Low", value: tasks.filter(t => t.priority === "Low").length, color: "#3b82f6" },
  ], [tasks]);

  const projectData = useMemo(() => projects.map(p => ({
    name: p.name,
    tasks: tasks.filter(t => t.project_id === p.id).length
  })).slice(0, 5), [projects, tasks]);

  const handleGenerateInsights = async () => {
    if (tasks.length === 0) {
      toast.info("Not enough data to generate insights");
      return;
    }
    
    setLoadingAi(true);
    try {
      const dataToAnalyze = {
        totalTasks, completedTasks, overdueCount, completionRate, priorityData, projectData
      };
      const res = await generateAnalyticsInsights(dataToAnalyze);
      if (res.insights) {
        setInsights(res.insights);
        toast.success("Insights generated successfully");
      }
    } catch {
      toast.error("Failed to generate insights");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground mt-1">Understand your productivity trends.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{completedTasks} of {totalTasks} tasks done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tasks / Day</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTasksPerDay}</div>
            <p className="text-xs text-muted-foreground mt-1">completed tasks per day</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">needs immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">active projects</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Productivity Insights
            </CardTitle>
            <CardDescription>Get personalized insights based on your task completion data.</CardDescription>
          </div>
          <Button onClick={handleGenerateInsights} disabled={loadingAi}>
            {loadingAi ? "Analyzing..." : "Generate AI Insights"}
          </Button>
        </CardHeader>
        {insights.length > 0 && (
          <CardContent className="grid gap-4 md:grid-cols-3">
            {insights.map((insight, i) => (
              <div key={i} className={`p-4 rounded-xl border bg-card shadow-sm
                ${insight.type === 'positive' ? 'border-green-500/30 shadow-green-500/5' : 
                  insight.type === 'negative' ? 'border-destructive/30 shadow-destructive/5' : ''}
              `}>
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                  {insight.type === 'positive' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {insight.type === 'negative' && <AlertCircle className="w-4 h-4 text-destructive" />}
                  {insight.title}
                </h4>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks per Project</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

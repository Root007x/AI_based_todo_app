"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { ActivityLog } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity, CheckCircle2, Plus, Pencil, Trash2,
  Mic, Users, FolderKanban, RefreshCw, Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  created:       { label: "Created",       icon: <Plus className="w-3 h-3" />,         color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  updated:       { label: "Updated",       icon: <Pencil className="w-3 h-3" />,        color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  completed:     { label: "Completed",     icon: <CheckCircle2 className="w-3 h-3" />,  color: "bg-primary/15 text-primary border-primary/30" },
  deleted:       { label: "Deleted",       icon: <Trash2 className="w-3 h-3" />,        color: "bg-destructive/15 text-destructive border-destructive/30" },
  assigned:      { label: "Assigned",      icon: <Users className="w-3 h-3" />,         color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  voice_created: { label: "Voice Import",  icon: <Mic className="w-3 h-3" />,           color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  status_change: { label: "Status Change", icon: <RefreshCw className="w-3 h-3" />,     color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  task:    <CheckCircle2 className="w-3.5 h-3.5" />,
  project: <FolderKanban className="w-3.5 h-3.5" />,
  team:    <Users className="w-3.5 h-3.5" />,
  voice:   <Mic className="w-3.5 h-3.5" />,
};

function LogItem({ log }: { log: ActivityLog }) {
  const action = ACTION_META[log.action] || ACTION_META.updated;

  return (
    <div className="flex items-start gap-3 py-3 group">
      <Avatar className="w-8 h-8 border shrink-0 mt-0.5">
        <AvatarImage src={log.user_avatar} />
        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
          {log.user_name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-semibold">{log.user_name}</span>
          <Badge variant="outline" className={cn("text-[10px] gap-0.5 py-0 px-1.5", action.color)}>
            {action.icon}
            {action.label}
          </Badge>
          {log.entity_title && (
            <span className="text-muted-foreground truncate max-w-[200px]">
              {ENTITY_ICONS[log.entity_type] && (
                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                  {ENTITY_ICONS[log.entity_type]}
                </span>
              )}{" "}
              &ldquo;{log.entity_title}&rdquo;
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { activityLogs, loadActivityLogs } = useStore();
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    await loadActivityLogs();
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group logs by date
  const grouped = activityLogs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
    const date = new Date(log.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            Activity Feed
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time log of all team actions across tasks, projects, and voice instructions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="self-start gap-2 h-9"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Activity</CardTitle>
          <CardDescription>Showing last 50 actions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && activityLogs.length === 0 ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading activity...</span>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Activity className="w-7 h-7 opacity-40" />
              </div>
              <p className="font-medium">No activity yet</p>
              <p className="text-sm text-center max-w-xs">
                Actions like creating tasks, updating statuses, and voice instructions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([date, logs]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                    {new Date(date).toDateString() === new Date().toDateString()
                      ? "Today"
                      : date}
                  </p>
                  <div className="divide-y divide-border/50 rounded-xl border overflow-hidden">
                    {logs.map(log => (
                      <div key={log.id} className="px-4 hover:bg-muted/20 transition-colors">
                        <LogItem log={log} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

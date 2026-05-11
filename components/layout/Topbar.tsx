"use client";

import { usePathname } from "next/navigation";
import { Bell, Sparkles, Menu, X, CheckCircle2, AlertCircle, Clock, Calendar, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { parseNaturalLanguageTask } from "@/lib/ai";
import { v4 as uuidv4 } from "uuid";
import {
  buildNotificationsFromTasks,
  requestNotificationPermission,
  sendBrowserNotification,
  AppNotification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({
  notifications,
  onMarkAllRead,
  onDismiss,
  onRequestPermission,
  browserPermission,
}: {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onRequestPermission: () => void;
  browserPermission: NotificationPermission | "unsupported";
}) {
  const severityIcon = (s: AppNotification["severity"]) => {
    if (s === "critical") return <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
    if (s === "warning") return <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    return <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
  };

  const severityBg = (s: AppNotification["severity"], read: boolean) => {
    if (read) return "bg-transparent";
    if (s === "critical") return "bg-destructive/5";
    if (s === "warning") return "bg-amber-500/5";
    return "bg-primary/5";
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-background border rounded-2xl shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div>
          <h3 className="font-semibold text-sm">Notifications</h3>
          {notifications.filter((n) => !n.read).length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {notifications.filter((n) => !n.read).length} unread
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onMarkAllRead}>
          Mark all read
        </Button>
      </div>

      {/* Browser push permission prompt */}
      {browserPermission === "default" && (
        <div className="px-4 py-3 border-b bg-primary/5 flex items-start gap-3">
          <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Enable push notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get OS-level reminders even when the app is in the background.
            </p>
            <Button size="sm" className="h-7 text-xs mt-2" onClick={onRequestPermission}>
              Allow Notifications
            </Button>
          </div>
        </div>
      )}
      {browserPermission === "denied" && (
        <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
          <BellOff className="w-3.5 h-3.5 shrink-0" />
          Push notifications are blocked. Enable them in your browser settings.
        </div>
      )}

      {/* Notification list */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mb-2 text-green-500 opacity-70" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs mt-1">No upcoming or overdue tasks.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 group",
                severityBg(n.severity, n.read)
              )}
            >
              {severityIcon(n.severity)}
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-semibold leading-snug", n.read && "text-muted-foreground")}>
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t bg-muted/20 text-center">
          <p className="text-xs text-muted-foreground">
            Notifications auto-refresh every 5 minutes
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { user, addTask, tasks, notifications, setNotifications, markAllNotificationsRead, dismissNotification } =
    useStore();

  const [aiInput, setAiInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const pageTitle =
    pathname === "/dashboard" ? "Dashboard" :
    pathname.startsWith("/tasks") ? "My Tasks" :
    pathname.startsWith("/projects") ? "Projects" :
    pathname.startsWith("/calendar") ? "Calendar" :
    pathname.startsWith("/analytics") ? "Analytics" :
    pathname.startsWith("/settings") ? "Settings" : "FlowAI";

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Check browser notification permission ──────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // ── Build & refresh notifications from tasks ───────────────────────────────
  const refreshNotifications = useCallback(() => {
    if (tasks.length === 0) return;

    const fresh = buildNotificationsFromTasks(tasks);

    // Preserve read state and createdAt for notifications we already have
    const existing = useStore.getState().notifications;
    const existingMap = new Map(existing.map((n) => [n.id, n]));
    
    const merged = fresh.map((n) => {
      const exist = existingMap.get(n.id);
      return exist ? { ...n, read: exist.read, createdAt: exist.createdAt } : n;
    });

    setNotifications(merged);

    // Send browser push for any new critical ones (not previously shown)
    const existingIds = new Set(existing.map((n) => n.id));
    merged
      .filter((n) => !existingIds.has(n.id) && n.severity === "critical")
      .forEach((n) => sendBrowserNotification(n.title, n.message));
  }, [tasks, setNotifications]);

  // Run on mount and every 5 minutes
  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  // ── Close panel on outside click ──────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Bell click ─────────────────────────────────────────────────────────────
  const handleBellClick = () => {
    setPanelOpen((prev) => !prev);
    if (!panelOpen && unreadCount > 0) {
      markAllNotificationsRead();
    }
  };

  // ── Request browser push permission ──────────────────────────────────────
  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setBrowserPermission(granted ? "granted" : "denied");
    if (granted) {
      toast.success("Browser notifications enabled!");
    } else {
      toast.error("Notification permission denied. You can enable it in browser settings.");
    }
  };

  // ── AI command handler ─────────────────────────────────────────────────────
  const handleAiCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setLoading(true);
    const toastId = toast.loading("AI is parsing your task...");
    try {
      const data = await parseNaturalLanguageTask(aiInput);
      const newTask = {
        id: uuidv4(),
        title: data.title || "Untitled Task",
        description: data.description || "",
        priority: data.priority || "Medium",
        status: "todo" as const,
        due_date: data.due_date || null,
        project_id: null,
        subtasks: [],
        tags: data.tags || [],
        created_at: new Date().toISOString(),
        ai_generated: true,
      };
      addTask(newTask);
      toast.success("Task created!", { id: toastId });
      setAiInput("");
    } catch {
      toast.error("AI unavailable, please try again", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      {/* Left: menu + page title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg md:text-xl font-semibold truncate max-w-[120px] md:max-w-none">
          {pageTitle}
        </h1>
      </div>

      {/* Center: AI command input */}
      <div className="flex-1 max-w-xl mx-8">
        <form onSubmit={handleAiCommand} className="relative">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          <Input
            placeholder="Tell AI to add a task... (e.g. 'Remind me to call John on Friday')"
            className="pl-9 bg-muted/50 border-transparent focus-visible:border-primary transition-colors"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            disabled={loading}
          />
        </form>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        {/* Bell with notification badge */}
        <div className="relative" ref={bellRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            onClick={handleBellClick}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className={cn("w-5 h-5 transition-colors", panelOpen && "text-primary")} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-0.5 border-2 border-background leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          {/* Notification panel dropdown */}
          {panelOpen && (
            <div ref={panelRef}>
              <NotificationPanel
                notifications={notifications}
                onMarkAllRead={markAllNotificationsRead}
                onDismiss={dismissNotification}
                onRequestPermission={handleRequestPermission}
                browserPermission={browserPermission}
              />
            </div>
          )}
        </div>

        {/* Avatar */}
        <Avatar className="w-9 h-9 border cursor-pointer">
          <AvatarImage src={user?.avatar || ""} />
          <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

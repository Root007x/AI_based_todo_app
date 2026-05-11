"use client";

import { Task, Priority } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from "date-fns";

/** Safely parse an ISO date string — returns null on invalid input */
function safeParse(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}
import { Calendar as CalendarIcon, CheckSquare, Sparkles, MoreVertical, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { breakDownTask } from "@/lib/ai";
import { toast } from "sonner";
import { useState, useMemo, memo } from "react";
import { v4 as uuidv4 } from "uuid";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export const TaskCard = memo(function TaskCard({ task, onEdit }: TaskCardProps) {
  const deleteTask = useStore(state => state.deleteTask);
  const updateTask = useStore(state => state.updateTask);
  const projects = useStore(state => state.projects);
  
  const [loadingAi, setLoadingAi] = useState(false);

  const project = useMemo(() => projects.find(p => p.id === task.project_id), [projects, task.project_id]);
  const doneSubtasks = useMemo(() => task.subtasks.filter(st => st.done).length, [task.subtasks]);

  const handleBreakDown = async () => {
    setLoadingAi(true);
    const toastId = toast.loading("AI is breaking down your task...");
    try {
      const res = await breakDownTask(task.title, task.description);
      if (res.subtasks && res.subtasks.length > 0) {
        const subtasksWithId = res.subtasks.map((st: { title: string }) => ({ ...st, id: uuidv4(), done: false }));
        await updateTask(task.id, { subtasks: [...task.subtasks, ...subtasksWithId] });
        toast.success("Task broken down successfully!", { id: toastId });
      } else {
        toast.info("Could not generate subtasks.", { id: toastId });
      }
    } catch {
      toast.error("Failed to break down task", { id: toastId });
    } finally {
      setLoadingAi(false);
    }
  };

  const priorityColors: Record<Priority, string> = {
    High: "bg-red-500/10 text-red-500 border-red-500/20",
    Medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  const isDone = task.status === "done";

  return (
    <Card className={`group relative transition-all duration-200 hover:shadow-md border-border/60 bg-card overflow-hidden ${isDone ? "opacity-60" : ""}`}>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateTask(task.id, { status: isDone ? "todo" : "done" });
            }}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0
              ${isDone
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground/30 hover:border-primary"
              }`}
          >
            {isDone && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm leading-snug line-clamp-2 transition-all ${isDone ? "text-muted-foreground line-through" : ""}`}>
              {task.title}
            </h4>
            {task.description && !isDone && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="h-7 w-7 -mr-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              aria-label="Task options"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBreakDown} disabled={loadingAi}>
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                {loadingAi ? "Breaking down..." : "AI Breakdown"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  deleteTask(task.id);
                  toast.success("Task deleted");
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-auto">
          <Badge variant="outline" className={`font-medium text-xs ${priorityColors[task.priority]}`}>
            {task.priority}
          </Badge>

          {task.status === "in_progress" && (
            <Badge variant="outline" className="font-medium text-xs bg-violet-500/10 text-violet-500 border-violet-500/20">
              In Progress
            </Badge>
          )}

          {task.due_date && (() => { const d = safeParse(task.due_date); return d ? (
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {format(d, "MMM d")}
            </div>
          ) : null; })()}

          {project && (
            <div className="flex items-center text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: project.color }} />
              <span className="truncate max-w-[90px]">{project.name}</span>
            </div>
          )}

          {task.ai_generated && (
            <div className="flex items-center gap-1 text-[10px] text-primary/60 font-medium ml-auto">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </div>
          )}
        </div>

        {task.subtasks.length > 0 && (
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                Subtasks
              </span>
              <span>{doneSubtasks}/{task.subtasks.length}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(doneSubtasks / task.subtasks.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

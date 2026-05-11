"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { parseNaturalLanguageTask } from "@/lib/ai";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Task, Priority, Subtask } from "@/lib/types";

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTask?: Task;
  defaultProjectId?: string;
  defaultDueDate?: string;
}

export function TaskModal({ open, onOpenChange, initialTask, defaultProjectId, defaultDueDate }: TaskModalProps) {
  const { addTask, updateTask, projects } = useStore();
  const [aiInput, setAiInput] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");

  // Sync form state whenever the modal opens or the task changes
  useEffect(() => {
    if (open) {
      setTitle(initialTask?.title || "");
      setDescription(initialTask?.description || "");
      setPriority(initialTask?.priority || "Medium");
      setDueDate(initialTask?.due_date || defaultDueDate || "");
      // Pre-select the defaultProjectId when creating a new task from a project page
      setProjectId(initialTask?.project_id || defaultProjectId || "none");
      setSubtasks(initialTask?.subtasks ? [...initialTask.subtasks] : []);
      setAiInput("");
      setNewSubtask("");
    }
  }, [open, initialTask, defaultProjectId, defaultDueDate]);

  const handleAiFill = async () => {
    if (!aiInput.trim()) return;
    setLoadingAi(true);
    try {
      const data = await parseNaturalLanguageTask(aiInput);
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.priority) setPriority(data.priority as Priority);
      if (data.due_date) setDueDate(data.due_date);
      toast.success("Form auto-filled by AI!");
      setAiInput("");
    } catch {
      toast.error("Failed to parse task via AI");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [...prev, { id: uuidv4(), title: newSubtask.trim(), done: false }]);
    setNewSubtask("");
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(st => st.id === id ? { ...st, done: !st.done } : st));
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (initialTask) {
      updateTask(initialTask.id, {
        title: title.trim(),
        description,
        priority,
        due_date: dueDate || null,
        project_id: projectId === "none" ? null : projectId,
        subtasks,
      });
      toast.success("Task updated");
    } else {
      addTask({
        id: uuidv4(),
        title: title.trim(),
        description,
        priority,
        status: "todo",
        due_date: dueDate || null,
        project_id: projectId === "none" ? null : projectId,
        subtasks,
        tags: [],
        created_at: new Date().toISOString(),
        ai_generated: false,
      });
      toast.success("Task created");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialTask ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {initialTask
              ? "Update your task details below."
              : "Use AI to generate task details or fill the form manually."}
          </DialogDescription>
        </DialogHeader>

        {/* AI Input — for new tasks */}
        {!initialTask && (
          <div className="flex gap-2">
            <Input
              placeholder="Describe your task to AI... (e.g. 'Call John Friday at 3pm')"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAiFill()}
              className="bg-primary/5 border-primary/20 text-sm"
            />
            <Button
              onClick={handleAiFill}
              disabled={loadingAi || !aiInput.trim()}
              variant="secondary"
              className="shrink-0"
              title="Generate with AI"
            >
              {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              className="resize-none h-20 text-sm"
            />
          </div>

          {/* Priority + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <div className="flex gap-1.5">
                {(["High", "Medium", "Low"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all
                      ${priority === p
                        ? p === "High" ? "bg-red-500 text-white border-red-500"
                          : p === "Medium" ? "bg-amber-500 text-white border-amber-500"
                          : "bg-blue-500 text-white border-blue-500"
                        : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="none">No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subtasks — works in both create AND edit mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Subtasks
              {subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({subtasks.filter((s) => s.done).length}/{subtasks.length} done)
                </span>
              )}
            </label>

            <div className="flex gap-2">
              <Input
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSubtask}
                disabled={!newSubtask.trim()}
                className="h-8 px-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/50 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st.id)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                        ${st.done ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"}`}
                    >
                      {st.done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <span className={`text-sm flex-1 ${st.done ? "line-through text-muted-foreground" : ""}`}>
                      {st.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteSubtask(st.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {initialTask ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

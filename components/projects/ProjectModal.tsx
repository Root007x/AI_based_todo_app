"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Project } from "@/lib/types";

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProject?: Project;
}

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"];

export function ProjectModal({ open, onOpenChange, initialProject }: ProjectModalProps) {
  const { addProject, updateProject } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[4]);
  const [dueDate, setDueDate] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName(initialProject?.name || "");
      setDescription(initialProject?.description || "");
      setColor(initialProject?.color || COLORS[4]);
      setDueDate(initialProject?.due_date || "");
    }
  }, [open, initialProject]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (initialProject) {
      updateProject(initialProject.id, {
        name: name.trim(),
        description,
        color,
        due_date: dueDate || null,
      });
      toast.success("Project updated");
    } else {
      addProject({
        id: uuidv4(),
        name: name.trim(),
        description,
        color,
        tasks: [],
        created_at: new Date().toISOString(),
        due_date: dueDate || null,
      });
      toast.success("Project created!");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{initialProject ? "Edit Project" : "Create New Project"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              className="resize-none h-20 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? "border-foreground scale-110 shadow-md" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Due Date (Optional)</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {initialProject ? "Save Changes" : "Create Project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

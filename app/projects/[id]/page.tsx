"use client";

import { useStore } from "@/lib/store";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckSquare, Edit2, Plus, Sparkles, Trash2 } from "lucide-react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskModal } from "@/components/tasks/TaskModal";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { useState } from "react";
import { toast } from "sonner";
import { suggestNextTask } from "@/lib/ai";
import { Task } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { projects, tasks, deleteProject } = useStore();
  const project = projects.find((p) => p.id === projectId);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [loadingAi, setLoadingAi] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-2xl font-bold">Project not found</h2>
        <Button onClick={() => router.push("/projects")}>Back to Projects</Button>
      </div>
    );
  }

  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  const completedTasks = projectTasks.filter((t) => t.status === "done").length;
  const progress = projectTasks.length ? (completedTasks / projectTasks.length) * 100 : 0;

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleAiSuggest = async () => {
    setLoadingAi(true);
    try {
      const pendingTasks = projectTasks.filter((t) => t.status !== "done");
      if (pendingTasks.length === 0) {
        toast.info("No pending tasks in this project.");
        return;
      }
      const res = await suggestNextTask(pendingTasks, new Date().toISOString());
      const task = tasks.find((t) => t.id === res.task_id);
      if (task) {
        toast.success(`AI Suggests: ${task.title}`, {
          description: res.reason,
          duration: 5000,
        });
      }
    } catch {
      toast.error("Failed to get AI suggestion");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenNewTask = () => {
    setEditingTask(undefined);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-sm font-medium text-muted-foreground">Back to Projects</div>
      </div>

      <div className="bg-card border rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: project.color }} />
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-4 flex-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-lg text-muted-foreground max-w-2xl">{project.description}</p>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsProjectModalOpen(true)}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit Project
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive" 
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </div>

          <div className="md:w-64 space-y-4 bg-muted/30 p-4 rounded-xl border">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">
                {completedTasks} / {projectTasks.length} tasks
              </span>
            </div>
            <Progress value={progress} className="h-2" />

            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={handleAiSuggest}
              disabled={loadingAi}
            >
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              {loadingAi ? "Thinking..." : "Suggest Next Step"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
        <Button onClick={handleOpenNewTask}>
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>

      {projectTasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed bg-muted/10">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">No tasks here</h3>
          <p className="text-sm mt-1 mb-4 max-w-sm mx-auto">
            This project doesn&apos;t have any tasks yet. Create one to start making progress.
          </p>
          <Button onClick={handleOpenNewTask} variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Add your first task
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectTasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={handleEditTask} />
          ))}
        </div>
      )}

      <TaskModal
        open={isTaskModalOpen}
        onOpenChange={(open) => {
          setIsTaskModalOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        initialTask={editingTask}
        defaultProjectId={editingTask ? undefined : projectId}
      />
      <ProjectModal
        open={isProjectModalOpen}
        onOpenChange={setIsProjectModalOpen}
        initialProject={project}
      />

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{project.name}</strong>? This action cannot be undone, and all tasks inside this project will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => { 
                deleteProject(project.id); 
                setIsDeleteModalOpen(false); 
                toast.success("Project deleted"); 
                router.push("/projects");
              }}
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

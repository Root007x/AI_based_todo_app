"use client";

import { Project } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";
import { Calendar, CheckSquare, FolderKanban, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { tasks, deleteProject, user } = useStore();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const projectTasks = tasks.filter(t => {
    const inProject = t.project_id === project.id;
    if (!inProject) return false;
    if (user?.role === "team_leader") return true;
    return t.assignee_id === user?.id;
  });
  
  const completedTasks = projectTasks.filter(t => t.status === "done").length;
  const progress = projectTasks.length ? (completedTasks / projectTasks.length) * 100 : 0;

  return (
    <>
      <Card 
        onClick={() => router.push(`/projects/${project.id}`)}
        className="group transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full border-border/50 bg-card overflow-hidden"
      >
        <div className="h-2 w-full" style={{ backgroundColor: project.color }} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              {project.due_date && (
                <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  {format(parseISO(project.due_date), "MMM d")}
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger 
                  onClick={(e) => e.stopPropagation()} 
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsDeleteModalOpen(true);
                    }} 
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <h3 className="font-semibold text-lg mt-4 line-clamp-1">{project.name}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[40px]">
            {project.description || "No description provided."}
          </p>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-muted-foreground">
                <CheckSquare className="w-4 h-4 mr-1.5" />
                <span>{completedTasks}/{projectTasks.length} tasks</span>
              </div>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
      
      <ProjectModal 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen} 
        initialProject={project} 
      />

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{project.name}</strong>? This action cannot be undone, and all tasks inside this project will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(false); }}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={(e) => { 
                e.stopPropagation(); 
                deleteProject(project.id); 
                setIsDeleteModalOpen(false); 
                toast.success("Project deleted"); 
              }}
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

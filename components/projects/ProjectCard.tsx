"use client";

import { Project } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";
import { Calendar, CheckSquare, FolderKanban } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { tasks } = useStore();
  const projectTasks = tasks.filter(t => t.project_id === project.id);
  const completedTasks = projectTasks.filter(t => t.status === "done").length;
  const progress = projectTasks.length ? (completedTasks / projectTasks.length) * 100 : 0;

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full border-border/50 bg-card overflow-hidden">
        <div className="h-2 w-full" style={{ backgroundColor: project.color }} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <FolderKanban className="w-5 h-5" />
            </div>
            {project.due_date && (
              <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                <Calendar className="w-3 h-3 mr-1.5" />
                {format(parseISO(project.due_date), "MMM d")}
              </div>
            )}
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
    </Link>
  );
}

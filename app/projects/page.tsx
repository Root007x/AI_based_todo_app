"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectModal } from "@/components/projects/ProjectModal";

export default function ProjectsPage() {
  const projects = useStore(state => state.projects);
  const tasks = useStore(state => state.tasks);
  const user = useStore(state => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredProjects = projects.filter(project => {
    if (user?.role === "team_leader") return true;
    // Show project if user has at least one task assigned to them in it
    return tasks.some(t => t.project_id === project.id && t.assignee_id === user?.id);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground mt-1">Organize your tasks into projects.</p>
        </div>
        <div className="flex items-center">
          {user?.role === "team_leader" && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl border-dashed bg-muted/10">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-1">No projects yet</h3>
          <p className="mb-4 text-sm">Create a project to group related tasks together.</p>
          {user?.role === "team_leader" && (
            <Button onClick={() => setIsModalOpen(true)} variant="outline">Create your first project</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}

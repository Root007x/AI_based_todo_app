"use client";

import { useState, useMemo, memo } from "react";
import { useStore } from "@/lib/store";
import { Task, TaskStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskModal } from "@/components/tasks/TaskModal";
import { LayoutGrid, List, Plus, Search, Filter } from "lucide-react";
import { DndContext, DragEndEvent, DragStartEvent, closestCorners, useDroppable, useDraggable, useSensor, useSensors, PointerSensor, DragOverlay } from "@dnd-kit/core";

export default function TasksPage() {
  const tasks = useStore(state => state.tasks);
  const updateTask = useStore(state => state.updateTask);
  
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description?.toLowerCase() || "").includes(search.toLowerCase())
    );
  }, [tasks, search]);

  const columns = useMemo(() => [
    { id: "todo" as TaskStatus, title: "To Do" },
    { id: "in_progress" as TaskStatus, title: "In Progress" },
    { id: "done" as TaskStatus, title: "Done" }
  ], []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateTask(taskId, { status: newStatus });
    }
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [tasks, activeId]);

  const openModal = (task?: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Tasks</h2>
          <p className="text-muted-foreground mt-1">Manage and organize your tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-3 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks..." 
            className="pl-9 bg-muted/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
          <div className="h-8 w-px bg-border mx-1" />
          <div className="flex bg-muted/50 p-1 rounded-lg">
            <Button 
              variant={view === "kanban" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={view === "list" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8"
              onClick={() => setView("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "kanban" ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 h-full overflow-x-auto pb-4">
              {columns.map(col => (
                <div key={col.id} className="flex-1 min-w-[300px] flex flex-col bg-muted/30 rounded-xl">
                  <div className="p-4 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-semibold">{col.title}</h3>
                    <span className="bg-background px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm">
                      {filteredTasks.filter(t => t.status === col.id).length}
                    </span>
                  </div>
                  <div id={col.id} className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px]">
                    <DroppableColumn id={col.id} tasks={filteredTasks.filter(t => t.status === col.id)} onEdit={openModal} />
                  </div>
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} onEdit={openModal} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="space-y-3 pb-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                No tasks found. Create one to get started.
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskCard key={task.id} task={task} onEdit={openModal} />
              ))
            )}
          </div>
        )}
      </div>

      <TaskModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        initialTask={editingTask} 
      />
    </div>
  );
}

const DroppableColumn = memo(function DroppableColumn({ id, tasks, onEdit }: { id: string, tasks: Task[], onEdit: (task: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[200px] space-y-3 h-full transition-all duration-200 rounded-xl ${isOver ? 'bg-primary/5 ring-2 ring-primary/30 p-1 -m-1' : ''}`}
    >
      {tasks.map(task => (
        <DraggableTask key={task.id} task={task} onEdit={onEdit} />
      ))}
      {tasks.length === 0 && (
        <div className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-sm transition-colors ${isOver ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground'}`}>
          Drop tasks here
        </div>
      )}
    </div>
  );
});

const DraggableTask = memo(function DraggableTask({ task, onEdit }: { task: Task, onEdit: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  
  const style = {
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <TaskCard task={task} onEdit={onEdit} />
    </div>
  );
});

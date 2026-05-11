"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Task } from "@/lib/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, differenceInHours } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight, CheckSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskModal } from "@/components/tasks/TaskModal";

export default function CalendarPage() {
  const tasks = useStore(state => state.tasks);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const paddingDays = useMemo(() => {
    const startDay = monthStart.getDay();
    return Array.from({ length: startDay }).map((_, i) => i);
  }, [monthStart]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (!task.due_date) return;
      const dateStr = task.due_date.split("T")[0];
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(task);
    });
    return map;
  }, [tasks]);

  const selectedDateTasks = useMemo(() => 
    tasksByDate.get(format(selectedDate, "yyyy-MM-dd")) || [],
    [tasksByDate, selectedDate]
  );

  const urgentTasks = useMemo(() => tasks.filter(t => {
    if (t.status === "done" || t.priority !== "High" || !t.due_date) return false;
    const hours = differenceInHours(parseISO(t.due_date), new Date());
    return hours >= 0 && hours <= 48;
  }), [tasks]);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
        {urgentTasks.length > 0 && (
          <Alert variant="destructive" className="shrink-0 bg-destructive/10 border-destructive/20 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Smart Deadline Warning</AlertTitle>
            <AlertDescription>
              You have {urgentTasks.length} High priority task(s) due within 48 hours.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
            <p className="text-muted-foreground mt-1">Manage your schedule and deadlines.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button onClick={() => {
              setEditingTask(undefined);
              setIsModalOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Add Task</span>
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5"/></Button>
              <span className="w-24 sm:w-32 text-center font-semibold text-sm sm:text-base">{format(currentDate, "MMMM yyyy")}</span>
              <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5"/></Button>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-card border rounded-2xl overflow-hidden flex flex-col shadow-sm">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-auto auto-rows-fr">
            {paddingDays.map(i => (
              <div key={`empty-${i}`} className="border-r border-b border-border/50 bg-muted/10 p-2 opacity-50" />
            ))}
            {daysInMonth.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayTasks = tasksByDate.get(dateStr) || [];
              const isSelected = isSameDay(day, selectedDate);
              const isCurrMonth = isSameMonth(day, currentDate);

              return (
                <div 
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`border-r border-b border-border/50 p-1 md:p-2 cursor-pointer transition-colors hover:bg-muted/30
                    ${!isCurrMonth ? 'opacity-50 bg-muted/10' : ''}
                    ${isSelected ? 'bg-primary/5 border-primary/20 ring-1 ring-inset ring-primary/20' : ''}
                  `}
                >
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                    ${isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'}
                  `}>
                    {format(day, "d")}
                  </div>
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">
                    {dayTasks.map(t => (
                      <div 
                        key={t.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(day);
                          handleEditTask(t);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium cursor-pointer hover:opacity-80 transition-opacity
                          ${t.status === 'done' ? 'bg-muted text-muted-foreground line-through' :
                            t.priority === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                            t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          }
                        `}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 shrink-0 bg-card border rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            Tasks for {format(selectedDate, "MMM d, yyyy")}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedDateTasks.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              No tasks scheduled for this day.
            </div>
          ) : (
            selectedDateTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={handleEditTask} />
            ))
          )}
        </div>
      </div>

      <TaskModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        initialTask={editingTask} 
        defaultDueDate={format(selectedDate, "yyyy-MM-dd")}
      />
    </div>
  );
}

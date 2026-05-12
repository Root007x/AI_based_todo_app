"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderKanban, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Settings, 
  LogOut,
  X,
  Code2,
  Crown,
  Users,
  Mic,
  Activity
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountRole } from "@/lib/types";

const roleMeta: Record<AccountRole, { label: string; icon: React.ReactNode; className: string }> = {
  team_leader: {
    label: "Team Leader",
    icon: <Crown className="w-3 h-3" />,
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px]",
  },
  developer: {
    label: "Developer",
    icon: <Code2 className="w-3 h-3" />,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]",
  },
  member: {
    label: "Member",
    icon: <Users className="w-3 h-3" />,
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]",
  },
};

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: CheckSquare, label: "My Tasks" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/voice", icon: Mic, label: "Voice Instructions", leaderOnly: true },
  { href: "/activity", icon: Activity, label: "Activity Feed" },
  { href: "/calendar", icon: CalendarIcon, label: "Calendar" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, setUser } = useStore();

  const handleLogout = () => {
    setUser(null);
    window.location.href = "/auth/login";
  };

  return (
    <aside className={cn(
      "w-[260px] h-screen fixed top-0 left-0 border-r bg-background flex flex-col z-50 transition-transform duration-300 md:translate-x-0",
      open ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <div className="w-4 h-4 bg-primary-foreground rounded-sm" />
          </div>
          <span className="text-xl font-bold tracking-tight">FlowAI</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden -mr-2" 
          onClick={() => setOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isLeaderOnly = (item as { leaderOnly?: boolean }).leaderOnly;
          if (isLeaderOnly && user?.role !== "team_leader") return null;
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isLeaderOnly && "border border-dashed border-primary/20 hover:border-primary/40"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {isLeaderOnly && (
                  <span className="ml-auto text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-semibold">Leader</span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="w-10 h-10 border">
            <AvatarImage src={user?.avatar || ""} />
            <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            {user?.role && (() => {
              const meta = roleMeta[user.role];
              return (
                <Badge variant="outline" className={`mt-1 gap-1 py-0 px-1.5 ${meta.className}`}>
                  {meta.icon} {meta.label}
                </Badge>
              );
            })()}
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

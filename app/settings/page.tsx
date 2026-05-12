"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Code2, Crown, Monitor, Moon, Sun, Upload, User, Users } from "lucide-react";
import { TeamManagement } from "@/components/team/TeamManagement";
import { AccountRole } from "@/lib/types";

const roleMeta: Record<AccountRole, { label: string; icon: React.ReactNode; className: string }> = {
  team_leader: {
    label: "Team Leader",
    icon: <Crown className="w-3 h-3" />,
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  developer: {
    label: "Developer",
    icon: <Code2 className="w-3 h-3" />,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  member: {
    label: "Member",
    icon: <Users className="w-3 h-3" />,
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
};

export default function SettingsPage() {
  const { user, setUser, updateUserPreferences, joinTeamByCode } = useStore();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarStr, setAvatarStr] = useState(user?.avatar || "");
  const [joinCode, setJoinCode] = useState("");
  const [joiningTeam, setJoiningTeam] = useState(false);

  const [workStart, setWorkStart] = useState(user?.preferences?.work_start || "09:00");
  const [workEnd, setWorkEnd] = useState(user?.preferences?.work_end || "17:00");
  const [focusHours, setFocusHours] = useState(user?.preferences?.focus_hours?.toString() || "4");

  const role = user?.role || "developer";
  const roleBadge = roleMeta[role];

  const handleProfileSave = () => {
    if (user) {
      setUser({ ...user, name, email, avatar: avatarStr });
      toast.success("Profile updated");
    }
  };

  const handlePreferencesSave = () => {
    updateUserPreferences({
      work_start: workStart,
      work_end: workEnd,
      focus_hours: parseInt(focusHours) || 4,
    });
    toast.success("Preferences updated");
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarStr(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    setJoiningTeam(true);
    const team = await joinTeamByCode(joinCode.trim().toUpperCase());
    if (team) {
      toast.success(`Joined team "${team.name}" successfully!`);
      setJoinCode("");
    } else {
      toast.error("Invalid invite code. Please check with your Team Leader.");
    }
    setJoiningTeam(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account, team, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-5 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg">Profile</TabsTrigger>
          <TabsTrigger value="team" className="rounded-lg">Team</TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg">Preferences</TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg">AI</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg">Appearance</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Update your personal information and avatar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24 border-2">
                  <AvatarImage src={avatarStr} />
                  <AvatarFallback className="text-2xl">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" className="relative cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" /> Upload Avatar
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`gap-1 text-xs ${roleBadge.className}`}>
                      {roleBadge.icon}
                      {roleBadge.label}
                    </Badge>
                    {user?.team_id && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Team member</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
                </div>
              </div>

              <Button onClick={handleProfileSave}>Save Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          {/* If member with no team, show join form */}
          {!user?.team_id && (
            <Card>
              <CardHeader>
                <CardTitle>Join a Team</CardTitle>
                <CardDescription>Enter an invite code from your Team Leader to join their workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 max-w-sm">
                  <Input
                    placeholder="e.g. AB12CD34"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    className="font-mono tracking-widest"
                  />
                  <Button onClick={handleJoinTeam} disabled={joiningTeam || !joinCode.trim()}>
                    {joiningTeam ? "Joining…" : "Join"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <TeamManagement />
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work Preferences</CardTitle>
              <CardDescription>Configure your working hours to help AI optimize your daily plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Work Start Time</label>
                  <Input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Work End Time</label>
                  <Input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Daily Focus Hours Goal</label>
                  <Input type="number" min="1" max="16" value={focusHours} onChange={e => setFocusHours(e.target.value)} />
                </div>
              </div>
              <Button onClick={handlePreferencesSave}>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>Manage how FlowAI assists you throughout the day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-medium text-sm">Auto-generate Daily Plan</h4>
                  <p className="text-xs text-muted-foreground mt-1">Automatically create an AI daily plan when you log in.</p>
                </div>
                <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer opacity-70">
                  <div className="w-4 h-4 bg-background rounded-full absolute top-1 right-1" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">AI Smart Insights</h4>
                  <p className="text-xs text-muted-foreground mt-1">Allow AI to analyze your task completion history for insights.</p>
                </div>
                <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-background rounded-full absolute top-1 right-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Customize the look and feel of your app.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className={`h-24 flex flex-col gap-2 ${theme === "light" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="w-6 h-6" /> Light
                </Button>
                <Button
                  variant="outline"
                  className={`h-24 flex flex-col gap-2 ${theme === "dark" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="w-6 h-6" /> Dark
                </Button>
                <Button
                  variant="outline"
                  className={`h-24 flex flex-col gap-2 ${theme === "system" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="w-6 h-6" /> System
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

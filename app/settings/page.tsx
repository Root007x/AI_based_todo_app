"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { User, Moon, Sun, Monitor, Upload } from "lucide-react";

export default function SettingsPage() {
  const { user, setUser, updateUserPreferences } = useStore();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarStr, setAvatarStr] = useState(user?.avatar || "");

  const [workStart, setWorkStart] = useState(user?.preferences?.work_start || "09:00");
  const [workEnd, setWorkEnd] = useState(user?.preferences?.work_end || "17:00");
  const [focusHours, setFocusHours] = useState(user?.preferences?.focus_hours?.toString() || "4");

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
      reader.onloadend = () => {
        setAvatarStr(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-4 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg">Profile</TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg">Preferences</TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg">AI Settings</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg">Appearance</TabsTrigger>
        </TabsList>

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
                  <AvatarFallback className="text-2xl"><User className="w-10 h-10 text-muted-foreground"/></AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="relative cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" /> Upload Avatar
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
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
                  className={`h-24 flex flex-col gap-2 ${theme === 'light' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-6 h-6" /> Light
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-24 flex flex-col gap-2 ${theme === 'dark' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-6 h-6" /> Dark
                </Button>
                <Button 
                  variant="outline" 
                  className={`h-24 flex flex-col gap-2 ${theme === 'system' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => setTheme('system')}
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

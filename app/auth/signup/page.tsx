"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AccountRole } from "@/lib/types";
import { Code2, Crown, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { useState } from "react";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const roles: { value: AccountRole; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "developer",
    label: "Developer",
    description: "Manage your own tasks, projects, and productivity. Best for individuals.",
    icon: <Code2 className="w-6 h-6" />,
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/40",
  },
  {
    value: "team_leader",
    label: "Team Leader",
    description: "Create a team, invite members, and oversee projects across your whole team.",
    icon: <Crown className="w-6 h-6" />,
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/40",
  },
  {
    value: "member",
    label: "Team Member",
    description: "Join an existing team using an invite code and collaborate on shared projects.",
    icon: <Users className="w-6 h-6" />,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { setUser, createTeam } = useStore();
  const [selectedRole, setSelectedRole] = useState<AccountRole>("developer");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [step, setStep] = useState<"role" | "details">("role");

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    const userId = uuidv4();

    const newUser = {
      id: userId,
      name: values.name,
      email: values.email,
      avatar: "",
      role: selectedRole,
      team_id: null as string | null,
      preferences: { work_start: "09:00", work_end: "17:00", focus_hours: 4 },
    };

    if (selectedRole === "team_leader") {
      if (!teamName.trim()) {
        toast.error("Please enter a team name.");
        return;
      }
      const team = {
        id: uuidv4(),
        name: teamName.trim(),
        description: "",
        owner_id: userId,
        invite_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        created_at: new Date().toISOString(),
      };
      newUser.team_id = team.id;
      await setUser(newUser);
      await createTeam(team);
      toast.success(`Team "${team.name}" created! Invite code: ${team.invite_code}`);
    } else if (selectedRole === "member") {
      if (!inviteCode.trim()) {
        toast.error("Please enter an invite code to join a team.");
        return;
      }
      // Will join team after login via settings - set user first
      await setUser(newUser);
      // Try to join immediately
      try {
        const res = await fetch(`http://localhost:3001/api/teams/by-invite/${inviteCode.trim().toUpperCase()}`);
        if (res.ok) {
          const team = await res.json();
          if (team) {
            newUser.team_id = team.id;
            await setUser({ ...newUser, team_id: team.id });
            toast.success(`Joined team "${team.name}" successfully!`);
          } else {
            toast.warning("Invite code not found — you can join a team later in Settings.");
          }
        }
      } catch {
        toast.warning("Could not connect to server. You can join a team later in Settings.");
      }
    } else {
      await setUser(newUser);
    }

    toast.success("Account created successfully!");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create an Account</h1>
          <p className="text-muted-foreground mt-2">Start your productivity journey with FlowAI.</p>
        </div>

        {step === "role" ? (
          <div className="space-y-4">
            <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Choose your account type
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={cn(
                    "relative flex flex-col items-start gap-3 rounded-2xl border-2 bg-gradient-to-br p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg",
                    role.color,
                    selectedRole === role.value
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] shadow-lg"
                      : "border-border/50 bg-muted/30"
                  )}
                >
                  <span className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    selectedRole === role.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {role.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-base">{role.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{role.description}</p>
                  </div>
                  {selectedRole === role.value && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {selectedRole === "team_leader" && (
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium">Team Name</label>
                <Input
                  placeholder="e.g. Alpha Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
            {selectedRole === "member" && (
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium">Team Invite Code</label>
                <Input
                  placeholder="e.g. AB12CD34"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="h-11 font-mono tracking-widest"
                />
                <p className="text-xs text-muted-foreground">Ask your Team Leader for the invite code.</p>
              </div>
            )}

            <Button className="w-full h-11 text-base mt-2" onClick={() => setStep("details")}>
              Continue →
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <Card className="border-border/50 shadow-xl shadow-black/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {roles.find(r => r.value === selectedRole)?.icon}
                </span>
                <div>
                  <CardTitle>Sign up as {roles.find(r => r.value === selectedRole)?.label}</CardTitle>
                  <CardDescription>Enter your details below to create your account.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="w-full h-11" onClick={() => setStep("role")}>
                      ← Back
                    </Button>
                    <Button type="submit" className="w-full h-11 text-base">
                      Create Account
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline ml-1 font-medium">
                Sign in
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

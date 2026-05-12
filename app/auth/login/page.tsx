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
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { AccountRole } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function LoginPage() {
  const router = useRouter();


  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    // Mock Authentication
    const role = typeof window !== 'undefined' 
      ? (localStorage.getItem('mock_login_role') as AccountRole) || "team_leader" 
      : "team_leader";
      
    const userId = uuidv4();
    const newUser = {
      id: userId,
      name: values.email.split("@")[0],
      email: values.email,
      avatar: "",
      role: role,
      team_id: null as string | null,
      preferences: {
        work_start: "09:00",
        work_end: "17:00",
        focus_hours: 4,
      }
    };

    if (role === "team_leader") {
      const teamId = uuidv4();
      newUser.team_id = teamId;
      await useStore.getState().setUser(newUser);
      await useStore.getState().createTeam({
        id: teamId,
        name: "Demo Team",
        description: "Created for testing push notifications.",
        owner_id: userId,
        invite_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        created_at: new Date().toISOString(),
      });
      await useStore.getState().addTeamMember({
        id: uuidv4(),
        team_id: teamId,
        user_id: userId,
        name: newUser.name,
        email: newUser.email,
        avatar: "",
        role: "team_leader",
        status: "active",
        joined_at: new Date().toISOString()
      });
    } else {
      await useStore.getState().setUser(newUser);
    }
    
    toast.success("Welcome back!");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to FlowAI</h1>
          <p className="text-muted-foreground mt-2">Your AI-powered productivity assistant.</p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>Enter your email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
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
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2 pt-2">
                  <FormLabel>Login Role (Mock Auth Testing)</FormLabel>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onChange={(e) => {
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('mock_login_role', e.target.value);
                      }
                    }}
                    defaultValue="team_leader"
                  >
                    <option value="developer">Developer</option>
                    <option value="team_leader">Team Leader</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Select Team Leader to test notification sending.</p>
                </div>
                <Button type="submit" className="w-full mt-6 text-base h-11">
                  Sign in
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline ml-1 font-medium">
              Sign up
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

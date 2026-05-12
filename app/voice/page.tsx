"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { VoiceInstruction } from "@/lib/types";
import { VoiceInstructionModal } from "@/components/voice/VoiceInstructionModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mic, Sparkles, Clock, CheckCircle2, User,
  Calendar, Flag, MessageSquareQuote, Loader2, Lock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const API_URL = "http://localhost:3001/api";

const PRIORITY_COLORS: Record<string, string> = {
  High:   "bg-red-500/15 text-red-400 border-red-500/30",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Low:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export default function VoicePage() {
  const { user } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState<VoiceInstruction[]>([]);
  const [loading, setLoading] = useState(true);

  const isLeader = user?.role === "team_leader";

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const url = user?.id
        ? `${API_URL}/voice?user_id=${user.id}&limit=20`
        : `${API_URL}/voice?limit=20`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail — server may not be running
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) fetchHistory(); // refresh history after modal closes
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Mic className="w-7 h-7 text-primary" />
            Voice Instructions
          </h2>
          <p className="text-muted-foreground mt-1">
            Speak task assignments — AI will extract and auto-assign them to team members.
          </p>
        </div>
        {isLeader ? (
          <div className="flex items-center">
            <Button
              onClick={() => setModalOpen(true)}
              className="gap-2 shadow-lg shadow-primary/20 h-11 px-6"
            >
              <Mic className="w-4 h-4" />
              New Voice Instruction
            </Button>
          </div>
        ) : (
          <Badge variant="outline" className="self-start gap-1.5 h-9 px-4">
            <Lock className="w-3.5 h-3.5" />
            Team Leader only
          </Badge>
        )}
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: Mic,
            color: "text-primary bg-primary/10",
            title: "1. Record",
            desc: "Press the mic button and speak your task instructions naturally.",
          },
          {
            icon: Sparkles,
            color: "text-amber-500 bg-amber-500/10",
            title: "2. AI Extracts",
            desc: "Gemini AI converts speech to text and extracts structured task assignments.",
          },
          {
            icon: CheckCircle2,
            color: "text-emerald-500 bg-emerald-500/10",
            title: "3. Auto-Assign",
            desc: "Tasks are created and team members are notified instantly via push notification.",
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <Card key={title} className="border-border/50">
            <CardContent className="pt-6">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-sm mb-1">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Instruction History
          </CardTitle>
          <CardDescription>Recent voice instructions and their extracted tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <MessageSquareQuote className="w-7 h-7 opacity-40" />
              </div>
              <p className="font-medium">No instructions yet</p>
              <p className="text-sm text-center max-w-xs">
                {isLeader
                  ? "Record your first voice instruction to get started."
                  : "Your team leader hasn't sent any voice instructions yet."}
              </p>
              {isLeader && (
                <Button variant="outline" size="sm" onClick={() => setModalOpen(true)} className="gap-2 mt-2">
                  <Mic className="w-4 h-4" />
                  Record Now
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl border bg-card p-4 space-y-3"
                >
                  {/* Transcript + timestamp */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                        Transcript
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground italic">
                        &ldquo;{item.transcript}&rdquo;
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {item.status}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Extracted tasks */}
                  {item.extracted_tasks && item.extracted_tasks.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Extracted Tasks ({item.extracted_tasks.length})
                      </p>
                      <div className="space-y-1.5">
                        {item.extracted_tasks.map((t, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2"
                          >
                            <span className="text-sm flex-1 min-w-0 truncate">{t.task}</span>
                            <Badge variant="outline" className="text-xs gap-1 shrink-0">
                              <User className="w-3 h-3" />
                              {t.assigned_to}
                            </Badge>
                            {t.deadline && (
                              <Badge variant="outline" className="text-xs gap-1 shrink-0">
                                <Calendar className="w-3 h-3" />
                                {t.deadline}
                              </Badge>
                            )}
                            {t.priority && (
                              <Badge variant="outline" className={cn("text-xs gap-1 shrink-0", PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.Medium)}>
                                <Flag className="w-3 h-3" />
                                {t.priority}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <VoiceInstructionModal open={modalOpen} onOpenChange={handleModalClose} />
    </div>
  );
}

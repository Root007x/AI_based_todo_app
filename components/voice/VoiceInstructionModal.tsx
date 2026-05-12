"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { ExtractedTask, Task } from "@/lib/types";
import {
  Mic, MicOff, Loader2, Sparkles, CheckCircle2,
  AlertCircle, User, Calendar, Flag, Plus, Trash2,
  Volume2, RefreshCw, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";

const API_URL = "http://localhost:3001/api";

const PRIORITY_COLORS: Record<string, string> = {
  High:   "bg-red-500/15 text-red-400 border-red-500/30",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Low:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

type Step = "idle" | "recording" | "transcribing" | "processing" | "review" | "done";

interface ExtractedTaskItem extends ExtractedTask {
  _id: string;
  matched_member_id: string | null;
  resolved_date: string | null;
}

interface VoiceInstructionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

export function VoiceInstructionModal({ open, onOpenChange, defaultProjectId }: VoiceInstructionModalProps) {
  const { user, teamMembers, addTask, logActivity, sendTaskAssignNotification } = useStore();

  const [step, setStep] = useState<Step>("idle");
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTaskItem[]>([]);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(16).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      stopRecording();
      setStep("idle");
      setTranscript("");
      setManualText("");
      setExtractedTasks([]);
      setAudioSeconds(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Wave animation ────────────────────────────────────────────────────────
  const startWave = useCallback(() => {
    waveTimerRef.current = setInterval(() => {
      setWaveHeights(Array(16).fill(0).map(() => Math.random() * 28 + 4));
    }, 120);
  }, []);

  const stopWave = useCallback(() => {
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    setWaveHeights(Array(16).fill(4));
  }, []);

  // ── Match team member by name (fuzzy) ─────────────────────────────────────
  const matchMember = useCallback((name: string) => {
    const lower = name.toLowerCase().trim();
    return teamMembers.find(m =>
      m.name.toLowerCase().includes(lower) || lower.includes(m.name.toLowerCase().split(" ")[0])
    ) || null;
  }, [teamMembers]);

  // ── Resolve date string to YYYY-MM-DD ────────────────────────────────────
  const resolveDate = (raw: string | null): string | null => {
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const now = new Date();
    const lower = raw.toLowerCase();
    if (lower === "today") return now.toISOString().split("T")[0];
    if (lower === "tomorrow") {
      const d = new Date(now); d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    }
    if (lower.includes("next week")) {
      const d = new Date(now); d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    }
    return null;
  };

  // ── Enrich extracted tasks from API with member matching ─────────────────
  const enrichTasks = useCallback((tasks: ExtractedTask[]): ExtractedTaskItem[] => {
    return tasks.map(t => ({
      ...t,
      _id: uuidv4(),
      matched_member_id: matchMember(t.assigned_to)?.user_id || null,
      resolved_date: resolveDate(t.deadline),
    }));
  }, [matchMember]);

  // ── Process via backend (audio or text) ──────────────────────────────────
  const processInstruction = useCallback(async (audioBlob?: Blob, textOverride?: string, isSttOnly?: boolean) => {
    setStep(isSttOnly ? "transcribing" : "processing");
    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append("audio", audioBlob, "voice.webm");
      }
      if (textOverride) {
        formData.append("transcript", textOverride);
      }
      if (isSttOnly) {
        formData.append("stt_only", "true");
      }
      formData.append("team_members", JSON.stringify(teamMembers));
      if (user?.id) formData.append("user_id", user.id);

      const res = await fetch(`${API_URL}/voice/process`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Server error");
      }
      const data = await res.json();
      if (isSttOnly) {
        setManualText(data.transcript || textOverride || "");
        setStep("idle");
        toast.success("Audio transcribed! You can edit the text below before extracting tasks.");
        return;
      }
      setTranscript(data.transcript || textOverride || "");
      const enriched = enrichTasks(data.tasks || []);
      setExtractedTasks(enriched);
      setStep("review");

      if (enriched.length === 0) {
        toast.warning("No tasks could be extracted. Try rephrasing.");
      } else {
        toast.success(`${enriched.length} task${enriched.length > 1 ? "s" : ""} extracted!`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Processing failed";
      toast.error(msg);
      setStep("idle");
    }
  }, [teamMembers, user, enrichTasks]);

  // ── Recording controls ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processInstruction(blob, undefined, true);
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setAudioSeconds(0);
      setStep("recording");
      startWave();
      timerRef.current = setInterval(() => setAudioSeconds(s => s + 1), 1000);
    } catch {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  }, [processInstruction, startWave]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopWave();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, [stopWave]);

  const handleSubmitText = () => {
    if (!manualText.trim()) return;
    processInstruction(undefined, manualText.trim(), false);
  };

  // ── Create tasks from review panel ───────────────────────────────────────
  const handleCreateTasks = async () => {
    if (extractedTasks.length === 0) return;
    const ids: string[] = [];

    for (const et of extractedTasks) {
      const id = uuidv4();
      ids.push(id);
      const task: Task = {
        id,
        title: et.task,
        description: `Extracted from voice instruction. Assigned to: ${et.assigned_to}`,
        priority: et.priority || "Medium",
        status: "todo",
        due_date: et.resolved_date || null,
        project_id: defaultProjectId || null,
        assignee_id: et.matched_member_id || null,
        subtasks: [],
        tags: ["voice", "ai"],
        created_at: new Date().toISOString(),
        ai_generated: true,
      };
      await addTask(task);

      // Send FCM notification to assignee
      if (et.matched_member_id) {
        await sendTaskAssignNotification(et.matched_member_id, et.task);
      }
    }

    // Log activity
    await logActivity({
      action: "voice_created",
      entity_type: "voice",
      entity_id: uuidv4(),
      entity_title: `${extractedTasks.length} tasks from voice instruction`,
      meta: { task_count: extractedTasks.length, transcript },
    });

    toast.success(`✅ ${extractedTasks.length} task${extractedTasks.length > 1 ? "s" : ""} created and assigned!`);
    setStep("done");
    setTimeout(() => onOpenChange(false), 1500);
  };

  const removeTask = (id: string) =>
    setExtractedTasks(prev => prev.filter(t => t._id !== id));

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            Voice Instruction
          </DialogTitle>
          <DialogDescription>
            Speak your task assignments or type them below. AI will extract and auto-assign tasks to team members.
          </DialogDescription>
        </DialogHeader>

        {/* ── IDLE / RECORDING ── */}
        {(step === "idle" || step === "recording") && (
          <div className="space-y-6 py-2">
            {/* Waveform / Mic button */}
            <div className="flex flex-col items-center gap-4">
              {step === "recording" ? (
                <>
                  {/* Animated waveform */}
                  <div className="flex items-center gap-1 h-12">
                    {waveHeights.map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-primary transition-all duration-100"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono tabular-nums">
                    {formatTime(audioSeconds)} — Recording...
                  </p>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full w-16 h-16 shadow-lg"
                    onClick={stopRecording}
                  >
                    <MicOff className="w-6 h-6" />
                  </Button>
                  <p className="text-xs text-muted-foreground">Click to stop and process</p>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
                    onClick={startRecording}
                  >
                    <Mic className="w-6 h-6" />
                  </Button>
                  <p className="text-sm text-muted-foreground">Click to start recording</p>
                </>
              )}
            </div>

            {/* Divider */}
            {step === "idle" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted-foreground">
                    <span className="bg-background px-2">or type instructions</span>
                  </div>
                </div>

                {/* Text input fallback */}
                <div className="space-y-2">
                  <Textarea
                    placeholder={`e.g., "Rahim design the login page by tomorrow. Karim create the API for authentication."`}
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    className="min-h-[100px] text-sm resize-none"
                  />
                  <Button
                    className="w-full gap-2"
                    onClick={handleSubmitText}
                    disabled={!manualText.trim()}
                  >
                    <Sparkles className="w-4 h-4" />
                    Extract Tasks with AI
                  </Button>
                </div>

                {/* Team members hint */}
                {teamMembers.length > 0 && (
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Available Team Members
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {teamMembers.map(m => (
                        <Badge key={m.id} variant="outline" className="text-xs gap-1">
                          <User className="w-3 h-3" />
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── PROCESSING / TRANSCRIBING ── */}
        {(step === "processing" || step === "transcribing") && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </div>
            <p className="font-semibold">
              {step === "transcribing" ? "Transcribing audio..." : "Processing with Gemini AI..."}
            </p>
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p className="flex items-center gap-2 justify-center">
                <Volume2 className="w-3.5 h-3.5 text-primary" />
                {step === "transcribing" ? "Converting speech to text" : "Extracting task assignments"}
              </p>
              {step === "processing" && (
                <p className="flex items-center gap-2 justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Processing text to tasks
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {step === "review" && (
          <div className="space-y-4 py-2">
            {/* Transcript */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Transcript
              </p>
              <p className="text-sm leading-relaxed">&ldquo;{transcript}&rdquo;</p>
            </div>

            {/* Extracted tasks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Extracted Tasks
                  <span className="ml-2 text-muted-foreground font-normal">
                    ({extractedTasks.length})
                  </span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  onClick={() => processInstruction(undefined, transcript)}
                >
                  <RefreshCw className="w-3 h-3" /> Re-extract
                </Button>
              </div>

              {extractedTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground border rounded-xl border-dashed">
                  <AlertCircle className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No tasks extracted. Try re-extracting or edit the transcript.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {extractedTasks.map(et => {
                    const member = teamMembers.find(m => m.user_id === et.matched_member_id);
                    return (
                      <div
                        key={et._id}
                        className="rounded-xl border bg-card p-3 space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug flex-1">{et.task}</p>
                          <button
                            onClick={() => removeTask(et._id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Assignee */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs gap-1",
                              member
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                            )}
                          >
                            <User className="w-3 h-3" />
                            {member ? member.name : et.assigned_to + " (unmatched)"}
                          </Badge>

                          {/* Priority */}
                          <Badge variant="outline" className={cn("text-xs gap-1", PRIORITY_COLORS[et.priority] || PRIORITY_COLORS.Medium)}>
                            <Flag className="w-3 h-3" />
                            {et.priority}
                          </Badge>

                          {/* Deadline */}
                          {et.deadline && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Calendar className="w-3 h-3" />
                              {et.resolved_date || et.deadline}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setStep("idle")}>
                ← Record Again
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleCreateTasks}
                disabled={extractedTasks.length === 0}
              >
                <Plus className="w-4 h-4" />
                Create {extractedTasks.length} Task{extractedTasks.length !== 1 ? "s" : ""}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="font-semibold text-emerald-500">Tasks Created!</p>
            <p className="text-sm text-muted-foreground">
              Team members have been notified.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

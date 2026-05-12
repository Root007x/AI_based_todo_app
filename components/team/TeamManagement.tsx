"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { AccountRole, TeamMember } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Code2, Copy, Crown, MoreVertical,
  Plus, Shield, Trash2, UserCheck, Users
} from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

const roleMeta: Record<AccountRole, { label: string; icon: React.ReactNode; badge: string }> = {
  team_leader: {
    label: "Team Leader",
    icon: <Crown className="w-3 h-3" />,
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  developer: {
    label: "Developer",
    icon: <Code2 className="w-3 h-3" />,
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  member: {
    label: "Member",
    icon: <Users className="w-3 h-3" />,
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
};

const statusMeta = {
  active: { label: "Active", color: "bg-emerald-500" },
  pending: { label: "Pending", color: "bg-yellow-500" },
  invited: { label: "Invited", color: "bg-blue-500" },
};

export function TeamManagement() {
  const { user, team, teamMembers, addTeamMember, updateTeamMember, removeTeamMember, updateTeam } = useStore();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AccountRole>("developer");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [newTeamName, setNewTeamName] = useState(team?.name || "");
  const [newTeamDesc, setNewTeamDesc] = useState(team?.description || "");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertBody, setAlertBody] = useState("");

  const isLeader = user?.role === "team_leader";

  const handleCopyInviteCode = () => {
    if (team?.invite_code) {
      navigator.clipboard.writeText(team.invite_code);
      toast.success("Invite code copied to clipboard!");
    }
  };

  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !team) return;
    const member: TeamMember = {
      id: uuidv4(),
      user_id: uuidv4(),
      team_id: team.id,
      name: inviteEmail.split("@")[0],
      email: inviteEmail.trim(),
      avatar: "",
      role: inviteRole,
      status: "invited",
      joined_at: new Date().toISOString(),
    };
    addTeamMember(member);
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    setShowInviteDialog(false);
  };

  const handleRoleChange = (member: TeamMember, newRole: AccountRole) => {
    if (!team) return;
    updateTeamMember(team.id, member.id, { role: newRole });
    toast.success(`${member.name}'s role updated to ${roleMeta[newRole].label}`);
  };

  const handleRemoveMember = () => {
    if (!selectedMember || !team) return;
    removeTeamMember(team.id, selectedMember.id);
    toast.success(`${selectedMember.name} removed from the team.`);
    setShowRemoveDialog(false);
    setSelectedMember(null);
  };

  const handleSaveTeamInfo = () => {
    if (!team) return;
    updateTeam(team.id, { name: newTeamName, description: newTeamDesc });
    setEditingTeamName(false);
    toast.success("Team info updated!");
  };

  const handleSendAlert = async () => {
    if (!alertTitle.trim() || !alertBody.trim()) return;
    await useStore.getState().sendTeamNotification(alertTitle, alertBody);
    toast.success("Team alert sent!");
    setShowAlertModal(false);
    setAlertTitle("");
    setAlertBody("");
  };

  if (!team) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No Team Yet</h3>
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            You are not part of a team. Sign up as a Team Leader to create one, or ask your leader for an invite code.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Team Overview
              </CardTitle>
              <CardDescription>Manage your team&apos;s details and invite code.</CardDescription>
            </div>
            {isLeader && !editingTeamName && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowAlertModal(true)}>
                  Send Alert
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setEditingTeamName(true);
                  setNewTeamName(team.name);
                  setNewTeamDesc(team.description);
                }}>
                  Edit
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingTeamName ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Team Name</label>
                <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Input value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} placeholder="What does this team do?" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveTeamInfo}>Save</Button>
                <Button variant="outline" onClick={() => setEditingTeamName(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Team Name</p>
                <p className="font-semibold text-lg">{team.name}</p>
                {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Members</p>
                <p className="font-semibold text-lg">{teamMembers.length} <span className="text-muted-foreground font-normal text-sm">total</span></p>
                <p className="text-sm text-muted-foreground">
                  {teamMembers.filter(m => m.status === "active").length} active · {teamMembers.filter(m => m.status === "invited").length} invited
                </p>
              </div>
            </div>
          )}

          {/* Invite Code */}
          {isLeader && (
            <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-dashed">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2">Team Invite Code</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                  {team.invite_code}
                </span>
                <Button size="sm" variant="outline" onClick={handleCopyInviteCode} className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Share this code with people you want to invite to your team.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Team Members
              </CardTitle>
              <CardDescription>{teamMembers.length} {teamMembers.length === 1 ? "member" : "members"} in this team</CardDescription>
            </div>
            {isLeader && (
              <Button size="sm" onClick={() => setShowInviteDialog(true)} className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No members yet. Invite people using the code above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const meta = roleMeta[member.role] || roleMeta.member;
                const sMeta = statusMeta[member.status] || statusMeta.active;
                const isCurrentUser = member.email === user?.email;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10 border">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                            {member.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${sMeta.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{member.name}</p>
                          {isCurrentUser && <span className="text-xs text-muted-foreground">(you)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`gap-1 text-xs ${meta.badge}`}>
                        {meta.icon}
                        {meta.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {sMeta.label}
                      </Badge>

                      {isLeader && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRoleChange(member, "developer")}>
                              <Code2 className="w-4 h-4 mr-2 text-blue-400" /> Set as Developer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member, "member")}>
                              <Users className="w-4 h-4 mr-2 text-emerald-400" /> Set as Member
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => { setSelectedMember(member); setShowRemoveDialog(true); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Remove from Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to a new member and assign their role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInviteMember()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AccountRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-blue-400" /> Developer
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" /> Member
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInviteMember} disabled={!inviteEmail.trim()}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{selectedMember?.name}</strong> from the team?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Send Alert Dialog */}
      <Dialog open={showAlertModal} onOpenChange={setShowAlertModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Team Alert</DialogTitle>
            <DialogDescription>Send a real-time push notification to all team members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Alert Title</label>
              <Input
                placeholder="e.g., Emergency Meeting"
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Message</label>
              <Input
                placeholder="e.g., Please join the voice channel immediately."
                value={alertBody}
                onChange={(e) => setAlertBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlertModal(false)}>Cancel</Button>
            <Button onClick={handleSendAlert} disabled={!alertTitle.trim() || !alertBody.trim()}>Send Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

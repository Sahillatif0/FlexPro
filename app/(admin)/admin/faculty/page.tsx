"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Mail, Plus, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface FacultyMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  totalSections: number;
  isActive: boolean;
  joinedAt: string;
}

interface FacultyPayload {
  faculty: FacultyMember[];
}

interface FacultyDetailRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  program: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FacultyDetailResponse {
  faculty: FacultyDetailRecord;
}

interface FacultyDetailForm {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  phone: string;
  address: string;
  bio: string;
  isActive: boolean;
}

export default function AdminFacultyPage() {
  const { toast } = useToast();
  const [data, setData] = useState<FacultyPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [updatingFacultyId, setUpdatingFacultyId] = useState<string | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FacultyDetailRecord | null>(null);
  const [detailForm, setDetailForm] = useState<FacultyDetailForm | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadFaculty() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/faculty?limit=100", {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load faculty list");
        }
        const payload: FacultyPayload = await response.json();
        if (!cancelled) {
          setData(payload);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setError(err?.message ?? "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFaculty();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!isDetailOpen || !selectedFacultyId) {
      setDetailError(null);
      setDetail(null);
      setDetailForm(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await fetch(`/api/admin/faculty/${selectedFacultyId}`, {
          signal: controller.signal,
        });
        const payload: FacultyDetailResponse = await response.json().catch(() => ({} as FacultyDetailResponse));
        if (!response.ok) {
          throw new Error((payload as any)?.message ?? "Unable to load faculty profile");
        }
        if (!cancelled) {
          setDetail(payload.faculty);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setDetailError(err?.message ?? "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isDetailOpen, selectedFacultyId]);

  useEffect(() => {
    if (!detail) {
      setDetailForm(null);
      return;
    }
    setDetailForm({
      firstName: detail.firstName,
      lastName: detail.lastName,
      email: detail.email,
      employeeId: detail.employeeId ?? "",
      department: detail.program ?? "",
      phone: detail.phone ?? "",
      address: detail.address ?? "",
      bio: detail.bio ?? "",
      isActive: detail.isActive,
    });
  }, [detail]);

  const filteredFaculty = useMemo(() => {
    if (!data) {
      return [] as FacultyMember[];
    }
    if (!searchTerm.trim()) {
      return data.faculty;
    }
    const term = searchTerm.trim().toLowerCase();
    return data.faculty.filter((member) => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      return (
        fullName.includes(term) ||
        member.email.toLowerCase().includes(term) ||
        (member.employeeId ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm]);

  const updateFacultyState = (id: string, updates: Partial<FacultyMember>) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            faculty: prev.faculty.map((member) =>
              member.id === id ? { ...member, ...updates } : member
            ),
          }
        : prev
    );
  };

  const handleToggleStatus = async (member: FacultyMember) => {
    if (updatingFacultyId) {
      return;
    }

    try {
      setUpdatingFacultyId(member.id);
      const response = await fetch(`/api/admin/faculty/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to update faculty");
      }
      updateFacultyState(member.id, { isActive: result.faculty.isActive });
      if (detail && detail.id === member.id) {
        setDetail({ ...detail, isActive: result.faculty.isActive });
        setDetailForm((prev) => (prev ? { ...prev, isActive: result.faculty.isActive } : prev));
      }
      toast({
        title: "Faculty status updated",
        description: `${member.firstName} ${member.lastName} is now ${result.faculty.isActive ? "active" : "inactive"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setUpdatingFacultyId(null);
    }
  };

  const handleInvite = async () => {
    if (isInviting) {
      return;
    }
    try {
      setIsInviting(true);
      const response = await fetch("/api/admin/faculty/invite", {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to send invite");
      }
      toast({
        title: "Invite dispatched",
        description: result?.message ?? "Invitation email sent successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Invite failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleDetailFieldChange = (field: keyof FacultyDetailForm, value: string | boolean) => {
    setDetailForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveDetail = async () => {
    if (!detail || !detailForm || detailSaving) {
      return;
    }

    const payload: Record<string, unknown> = {};
    const trim = (value: string) => value.trim();

    if (trim(detailForm.firstName) && trim(detailForm.firstName) !== detail.firstName) {
      payload.firstName = trim(detailForm.firstName);
    }
    if (trim(detailForm.lastName) && trim(detailForm.lastName) !== detail.lastName) {
      payload.lastName = trim(detailForm.lastName);
    }
    if (trim(detailForm.email) && trim(detailForm.email).toLowerCase() !== detail.email.toLowerCase()) {
      payload.email = trim(detailForm.email);
    }
    if (trim(detailForm.employeeId) !== (detail.employeeId ?? "")) {
      payload.employeeId = trim(detailForm.employeeId);
    }
    if (trim(detailForm.department) !== (detail.program ?? "")) {
      payload.department = trim(detailForm.department);
    }
    if (trim(detailForm.phone) !== (detail.phone ?? "")) {
      payload.phone = trim(detailForm.phone);
    }
    if (trim(detailForm.address) !== (detail.address ?? "")) {
      payload.address = trim(detailForm.address);
    }
    if (trim(detailForm.bio) !== (detail.bio ?? "")) {
      payload.bio = trim(detailForm.bio);
    }
    if (detailForm.isActive !== detail.isActive) {
      payload.isActive = detailForm.isActive;
    }

    if (!Object.keys(payload).length) {
      toast({
        title: "No changes detected",
        description: "Update at least one field before saving.",
      });
      return;
    }

    try {
      setDetailSaving(true);
      const response = await fetch(`/api/admin/faculty/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to update faculty member");
      }

      const updated = result.faculty as FacultyDetailRecord;
      setDetail((prev) => (prev ? { ...prev, ...updated } : updated));
      setDetailForm((prev) =>
        prev
          ? {
              ...prev,
              firstName: updated.firstName,
              lastName: updated.lastName,
              email: updated.email,
              employeeId: updated.employeeId ?? "",
              department: updated.program ?? "",
              phone: updated.phone ?? "",
              address: updated.address ?? "",
              bio: updated.bio ?? "",
              isActive: updated.isActive,
            }
          : prev
      );
      updateFacultyState(updated.id, {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        employeeId: updated.employeeId,
        department: updated.program,
        isActive: updated.isActive,
      });
      toast({
        title: "Faculty updated",
        description: `${updated.firstName} ${updated.lastName}'s profile was saved successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setDetailSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Faculty Directory</h1>
          <p className="text-sm text-gray-400">
            Review faculty profiles and monitor teaching assignments across departments.
          </p>
        </div>
        <Button
          onClick={handleInvite}
          disabled={isInviting}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {isInviting ? "Sending..." : "Invite Faculty"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load faculty</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="space-y-4 lg:flex lg:items-center lg:justify-between lg:space-y-0">
          <CardTitle className="text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-400" />
            Faculty Members
          </CardTitle>
          <div className="w-full max-w-xs">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or ID"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-20 bg-gray-800" />
              ))}
            </div>
          ) : filteredFaculty.length ? (
            <div className="space-y-3">
              {filteredFaculty.map((member) => (
                <div key={member.id} className="rounded-lg bg-gray-800/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {member.firstName} {member.lastName}
                      </p>
                      <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
                        <span>{member.email}</span>
                        {member.employeeId ? <span>| ID {member.employeeId}</span> : null}
                        {member.department ? <span>| {member.department}</span> : null}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        member.isActive
                          ? "bg-emerald-600/20 text-emerald-400"
                          : "bg-gray-600/20 text-gray-300"
                      }
                    >
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span>Assigned sections: {member.totalSections}</span>
                    <span>|</span>
                    <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-200"
                      onClick={() => handleToggleStatus(member)}
                      disabled={updatingFacultyId === member.id}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      {updatingFacultyId === member.id
                        ? "Updating..."
                        : member.isActive
                        ? "Disable"
                        : "Enable"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-purple-600/30 text-purple-200 hover:bg-purple-600/40"
                      onClick={() => {
                        setSelectedFacultyId(member.id);
                        setIsDetailOpen(true);
                      }}
                    >
                      View profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <GraduationCap className="h-10 w-10 text-gray-500" />
              <p className="text-sm text-gray-400">No faculty found matching your filters.</p>
              <Button variant="outline" className="text-gray-300 border-gray-700" onClick={() => setSearchTerm("")}>
                Clear search
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="border-purple-500/40 bg-purple-500/10 text-purple-200">
        <Mail className="h-4 w-4" />
        <AlertTitle>Onboarding tip</AlertTitle>
        <AlertDescription>
          Invited faculty receive a welcome email with temporary credentials. Ask them to update their profile information on first sign-in.
        </AlertDescription>
      </Alert>

      <Sheet
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setSelectedFacultyId(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full border-l border-gray-800 bg-gray-950 text-gray-100 sm:max-w-3xl"
        >
          {detailLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 bg-gray-800" />
              ))}
            </div>
          ) : detailError ? (
            <div className="flex h-full flex-col items-center justify-center space-y-3 text-center">
              <Alert variant="destructive" className="max-w-sm bg-red-500/10 text-red-100">
                <AlertTitle>Unable to load profile</AlertTitle>
                <AlertDescription>{detailError}</AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="border-gray-700 text-gray-200"
                onClick={() => {
                  if (selectedFacultyId) {
                    setIsDetailOpen(false);
                    setTimeout(() => setIsDetailOpen(true), 10);
                  }
                }}
              >
                Retry
              </Button>
            </div>
          ) : detail && detailForm ? (
            <div className="flex h-full flex-col gap-4">
              <SheetHeader className="space-y-1 text-left">
                <SheetTitle className="text-white">
                  {detail.firstName} {detail.lastName}
                </SheetTitle>
                <SheetDescription className="text-gray-400">
                  {detail.email}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1 pr-3">
                <div className="space-y-6 pb-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300">
                      <p className="text-xs uppercase text-gray-500">Employee ID</p>
                      <p className="font-medium text-white">{detail.employeeId ?? "Not assigned"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300">
                      <p className="text-xs uppercase text-gray-500">Status</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={detail.isActive ? "bg-emerald-600/20 text-emerald-400" : "bg-gray-600/20 text-gray-300"}
                        >
                          {detail.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Switch
                          checked={detailForm.isActive}
                          onCheckedChange={(value) => handleDetailFieldChange("isActive", value)}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">First name</label>
                        <Input
                          value={detailForm.firstName}
                          onChange={(event) => handleDetailFieldChange("firstName", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Last name</label>
                        <Input
                          value={detailForm.lastName}
                          onChange={(event) => handleDetailFieldChange("lastName", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Email</label>
                        <Input
                          type="email"
                          value={detailForm.email}
                          onChange={(event) => handleDetailFieldChange("email", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Employee ID</label>
                        <Input
                          value={detailForm.employeeId}
                          onChange={(event) => handleDetailFieldChange("employeeId", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300">Department</label>
                      <Input
                        value={detailForm.department}
                        onChange={(event) => handleDetailFieldChange("department", event.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Phone</label>
                        <Input
                          value={detailForm.phone}
                          onChange={(event) => handleDetailFieldChange("phone", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Office / Address</label>
                        <Input
                          value={detailForm.address}
                          onChange={(event) => handleDetailFieldChange("address", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300">Faculty notes</label>
                      <Textarea
                        value={detailForm.bio}
                        onChange={(event) => handleDetailFieldChange("bio", event.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        rows={4}
                        placeholder="Capture teaching interests, advising notes, or workload preferences."
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-white"
                  onClick={() => {
                    setDetailForm({
                      firstName: detail.firstName,
                      lastName: detail.lastName,
                      email: detail.email,
                      employeeId: detail.employeeId ?? "",
                      department: detail.program ?? "",
                      phone: detail.phone ?? "",
                      address: detail.address ?? "",
                      bio: detail.bio ?? "",
                      isActive: detail.isActive,
                    });
                  }}
                  disabled={detailSaving}
                >
                  Reset changes
                </Button>
                <Button
                  onClick={handleSaveDetail}
                  disabled={detailSaving}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  {detailSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Select a faculty member to view details.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

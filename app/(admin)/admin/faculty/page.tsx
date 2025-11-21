"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Mail, Plus, ShieldCheck } from "lucide-react";

interface FacultyMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  totalCourses: number;
  isActive: boolean;
  joinedAt: string;
}

interface FacultyPayload {
  faculty: FacultyMember[];
}

export default function AdminFacultyPage() {
  const { toast } = useToast();
  const [data, setData] = useState<FacultyPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [updatingFacultyId, setUpdatingFacultyId] = useState<string | null>(null);

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
        console.log(payload);
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

  const filteredFaculty = useMemo(() => {
    if (!data) {
      return [];
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

  const updateFacultyState = (updated: FacultyMember) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            faculty: prev.faculty.map((member) =>
              member.id === updated.id ? updated : member
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
      updateFacultyState({ ...member, isActive: result.faculty.isActive });
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
                    <span>Assigned courses: {member.totalCourses}</span>
                    <span>|</span>
                    <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
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
    </div>
  );
}

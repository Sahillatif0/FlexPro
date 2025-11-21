"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Wifi, Save, Loader2 } from "lucide-react";

interface AdminSettingsPayload {
  maintenanceMode: boolean;
  enrollmentStatus: "open" | "closed" | "waitlist";
  supportEmail: string;
  broadcastMessage: string;
  sessionTimeoutMinutes: number;
}

const enrollmentOptions = [
  { label: "Open for enrollment", value: "open" },
  { label: "Enrollment closed", value: "closed" },
  { label: "Waitlist only", value: "waitlist" },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminSettingsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/settings");
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load admin settings");
        }
        const payload: AdminSettingsPayload = await response.json();
        if (!cancelled) {
          setSettings(payload);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!settings || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to update settings");
      }
      toast({
        title: "Settings saved",
        description: result?.message ?? "Administrative preferences have been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="bg-gray-900 border-gray-800">
            <CardHeader>
              <Skeleton className="h-4 w-36 bg-gray-800" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 bg-gray-800" />
              <Skeleton className="h-10 bg-gray-800" />
              <Skeleton className="h-10 bg-gray-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load settings</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Administration Settings</h1>
        <p className="text-sm text-gray-400">
          Adjust global platform preferences and enrollment policies for the FlexPro portal.
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Platform Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-white">Maintenance mode</p>
              <p className="text-xs text-gray-400">
                Temporarily disable student and faculty access while performing upgrades.
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(value) =>
                setSettings((prev) => (prev ? { ...prev, maintenanceMode: value } : prev))
              }
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Active enrollment window</p>
            <Select
              value={settings.enrollmentStatus}
              onValueChange={(value: AdminSettingsPayload["enrollmentStatus"]) =>
                setSettings((prev) => (prev ? { ...prev, enrollmentStatus: value } : prev))
              }
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                {enrollmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-white">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Session timeout (minutes)</p>
            <Input
              type="number"
              min={5}
              max={240}
              value={settings.sessionTimeoutMinutes}
              onChange={(event) =>
                setSettings((prev) =>
                  prev
                    ? { ...prev, sessionTimeoutMinutes: Number(event.target.value) || 30 }
                    : prev
                )
              }
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wifi className="h-5 w-5 text-purple-400" />
            Communications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Support email</p>
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(event) =>
                setSettings((prev) => (prev ? { ...prev, supportEmail: event.target.value } : prev))
              }
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="support@flexpro.edu"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Broadcast message</p>
            <Textarea
              value={settings.broadcastMessage}
              onChange={(event) =>
                setSettings((prev) =>
                  prev ? { ...prev, broadcastMessage: event.target.value } : prev
                )
              }
              className="bg-gray-800 border-gray-700 text-white"
              rows={5}
              placeholder="Share campus-wide announcements with all users"
            />
            <p className="text-xs text-gray-500">
              Messages appear on student and faculty dashboards for 48 hours.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

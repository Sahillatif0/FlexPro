'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Mail, Phone, MapPin, Book, Award, Calendar, Save, Edit3 } from 'lucide-react';
import type { User as StoreUser } from '@/store/user-slice';

export default function ProfilePage() {
  const { user, setUser } = useAppStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const userId = user?.id;

  const syncFormWithUser = () => {
    if (!user) return;
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio || '',
      phone: user.phone || '',
      address: user.address || '',
    });
  };

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    async function loadProfile() {
      if (!userId) return;
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId });
        const response = await fetch(`/api/profile?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load profile');
        }

        const payload = (await response.json()) as {
          user: StoreUser;
        };

        setUser(payload.user);
        setFormData({
          firstName: payload.user.firstName,
          lastName: payload.user.lastName,
          bio: payload.user.bio || '',
          phone: payload.user.phone || '',
          address: payload.user.address || '',
        });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Profile fetch error', err);
        setError(err.message || 'Failed to load profile');
        toast({
          title: 'Unable to load profile',
          description: err.message || 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
    return () => controller.abort();
  }, [setUser, toast, userId]);

  const handleDialogChange = (open: boolean) => {
    setIsEditOpen(open);
    if (!open) {
      syncFormWithUser();
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...formData,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || 'Failed to update profile');
      }

      const payload = (await response.json()) as {
        user: StoreUser;
      };

      setUser(payload.user);
      setFormData({
        firstName: payload.user.firstName,
        lastName: payload.user.lastName,
        bio: payload.user.bio || '',
        phone: payload.user.phone || '',
        address: payload.user.address || '',
      });

      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved successfully.',
      });

      setIsEditOpen(false);
    } catch (err: any) {
      console.error('Profile save error', err);
      toast({
        title: 'Unable to update profile',
        description: err.message || 'Please try again later.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    syncFormWithUser();
  }, [user]);

  if (!user) {
    return <p className="text-gray-300">Sign in to view profile information.</p>;
  }

  const cgpaDisplay = Number.isFinite(user.cgpa) ? user.cgpa.toFixed(2) : 'N/A';
  const phoneDisplay = user.phone || 'Not provided';
  const addressDisplay = user.address || 'Not provided';
  const bioDisplay = user.bio || 'No bio provided yet.';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/20 via-indigo-500/15 to-transparent p-8">
        <div className="absolute inset-y-0 right-0 hidden h-full w-1/2 bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.35),transparent_55%)] md:block" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-3xl font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)]">
              <span>
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold text-white md:text-4xl">
                  {user.firstName} {user.lastName}
                </h2>
                <Badge variant="secondary" className="border-white/20 bg-white/10 text-white/90">
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-white/80">{user.program}</p>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium">
                  Student ID {user.studentId}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium">
                  Semester {user.semester}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium">
                  CGPA {cgpaDisplay}
                </span>
              </div>
              {isLoading ? (
                <span className="text-xs text-white/70">Refreshing profile…</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-white/30 bg-white/5 px-6 text-white hover:bg-white/10"
            >
              Upload Photo
            </Button>
            <Button
              onClick={() => handleDialogChange(true)}
              className="h-11 rounded-2xl bg-blue-600 px-6 text-white transition hover:bg-blue-700"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-white/10 bg-[#0b1220]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Personal Details</CardTitle>
            <p className="text-sm text-slate-400">Your primary contact information</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">First Name</p>
                <div className="mt-2 flex items-center gap-2 text-white">
                  <UserIcon className="h-4 w-4 text-white/60" />
                  <span>{user.firstName}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Last Name</p>
                <div className="mt-2 flex items-center gap-2 text-white">
                  <UserIcon className="h-4 w-4 text-white/60" />
                  <span>{user.lastName}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Email</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-white">
                  <Mail className="h-4 w-4 text-white/60" />
                  <span>{user.email}</span>
                  <Badge variant="outline" className="border-emerald-400/40 text-emerald-300">
                    Verified
                  </Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Phone</p>
                <div className="mt-2 flex items-center gap-2 text-white">
                  <Phone className="h-4 w-4 text-white/60" />
                  <span>{phoneDisplay}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Address</p>
                <div className="mt-2 flex items-center gap-2 text-white">
                  <MapPin className="h-4 w-4 text-white/60" />
                  <span>{addressDisplay}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-[#0b1220]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Academic Snapshot</CardTitle>
            <p className="text-sm text-slate-400">Key highlights from your program</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Book className="h-5 w-5 text-sky-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/45">Program</p>
                  <p className="text-sm font-medium text-white">{user.program}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/45">Current Semester</p>
                  <p className="text-sm font-medium text-white">Semester {user.semester}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/45">CGPA</p>
                  <p className="text-sm font-medium text-white">{cgpaDisplay}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-white/10 bg-[#0b1220]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl text-white">About</CardTitle>
          <p className="text-sm text-slate-400">A quick introduction that appears across the portal</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
            {bioDisplay}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <Dialog open={isEditOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="student-popover max-w-2xl border border-white/10 bg-[#0b1220]">
          <DialogHeader>
            <DialogTitle className="text-white">Edit profile details</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your personal information so classmates and faculty can connect with you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.25em] text-white/45">First Name</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="student-input mt-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.25em] text-white/45">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="student-input mt-2"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.25em] text-white/45">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="student-input mt-2"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.25em] text-white/45">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter mailing address"
                  className="student-input mt-2"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-white/45">Bio</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell your story in a few sentences"
                className="student-input mt-2 min-h-[120px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/20 bg-transparent text-slate-200 hover:bg-white/10 sm:w-auto"
              onClick={() => handleDialogChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
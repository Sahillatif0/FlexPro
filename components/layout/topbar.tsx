'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Search, Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAppStore } from '@/store';
import { AuthMenu } from '@/components/auth/auth-menu';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  isGlobal: boolean;
  createdAt: string;
}

function formatRelativeTime(dateString: string) {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.max(Math.round(diffMs / 60000), 0);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return target.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function Topbar() {
  const { toggleSidebar, user } = useAppStore();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setNotifications([]);
      return;
    }

    const controller = new AbortController();

    async function loadNotifications(currentUserId: string) {
      setIsLoadingNotifications(true);
      setNotificationError(null);

      try {
        const params = new URLSearchParams();
        params.set('userId', currentUserId);
        params.set('take', '25');
        const response = await fetch(`/api/notifications?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load notifications');
        }

        const payload = (await response.json()) as {
          notifications: NotificationItem[];
        };

        if (!controller.signal.aborted) {
          setNotifications(payload.notifications);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Notification fetch error', error);
        setNotificationError(error.message || 'Unable to load notifications');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingNotifications(false);
        }
      }
    }

    void loadNotifications(userId);

    return () => controller.abort();
  }, [user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  useEffect(() => {
    const userId = user?.id;
    if (!isNotificationOpen || !userId) return;
    const unreadIds = notifications.filter((notification) => !notification.isRead).map((notification) => notification.id);
    if (!unreadIds.length) return;

    async function markAsRead() {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, notificationIds: unreadIds }),
        });

        setNotifications((prev) =>
          prev.map((notification) =>
            unreadIds.includes(notification.id)
              ? { ...notification, isRead: true }
              : notification
          )
        );
      } catch (error) {
        console.error('Failed to mark notifications as read', error);
      }
    }

    void markAsRead();
  }, [isNotificationOpen, notifications, user?.id]);

  const accentClasses = useMemo(
    () => ({
      billing: 'border-amber-400/30 text-amber-200',
      warning: 'border-amber-400/30 text-amber-200',
      payment: 'border-emerald-400/30 text-emerald-200',
      enrollment: 'border-emerald-400/30 text-emerald-200',
      success: 'border-emerald-400/30 text-emerald-200',
      academics: 'border-sky-400/30 text-sky-200',
      info: 'border-sky-400/30 text-sky-200',
      exam: 'border-fuchsia-400/30 text-fuchsia-200',
      community: 'border-fuchsia-400/30 text-fuchsia-200',
      alert: 'border-rose-400/40 text-rose-200',
      error: 'border-rose-400/40 text-rose-200',
    }),
    []
  );

  return (
    <header className="relative z-30 flex h-auto flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#050915]/85 px-4 py-3 backdrop-blur-2xl sm:h-20 sm:flex-nowrap sm:gap-6 sm:px-8 sm:py-0">
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300/80 shadow-[0_10px_30px_-18px_rgba(59,130,246,0.6)] hover:text-white lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {!user ? null : (
          <div className="hidden flex-col sm:flex">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400/65">
              Welcome Back
            </span>
            <span className="text-lg font-semibold text-white">
              {user.firstName} {user.lastName}
            </span>
          </div>
        )}
      </div>

      <div className="order-3 w-full flex-1 px-0 sm:order-none sm:mx-auto sm:max-w-xl sm:px-2">
        <div className="group relative">
          <div className="pointer-events-none absolute -inset-[1px] rounded-[1.05rem] bg-gradient-to-r from-sky-500/25 via-indigo-500/20 to-blue-500/20 opacity-0 blur-[1px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
          <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-[#0b1220]/80 backdrop-blur">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400/70 transition-colors duration-300 group-focus-within:text-blue-200 group-hover:text-blue-200" />
            <Input
              placeholder="Search courses, deadlines, resources..."
              className="h-11 w-full rounded-[1rem] border border-transparent bg-transparent pl-12 pr-16 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-200/75 sm:inline">
              Ctrl K
            </span>
          </div>
        </div>
      </div>

      <div className="order-2 flex min-w-fit items-center justify-end gap-3 sm:order-none sm:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-blue-500/50 hover:text-white sm:flex"
        >
          <Sparkles className="h-4 w-4 text-emerald-400" />
          Quick Actions
        </Button>

        <Sheet open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300/80 transition-colors hover:border-blue-500/40 hover:text-white"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-1 text-[10px] font-semibold text-white shadow-[0_0_12px_rgba(236,72,153,0.6)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex h-full flex-col gap-6 border-white/10 bg-[#050915] text-white sm:max-w-md"
          >
            <SheetHeader className="space-y-2">
              <SheetTitle className="text-left text-xl font-semibold text-white">
                Notifications
              </SheetTitle>
              <SheetDescription className="text-left text-sm text-slate-400">
                Stay updated with upcoming deadlines, billing activity, and announcements.
              </SheetDescription>
            </SheetHeader>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300/75">
              <span className="font-medium text-white/80">
                {unreadCount} unread
              </span>
              <span className="text-slate-400/75">
                {isLoadingNotifications ? 'Syncing…' : 'Synced moments ago'}
              </span>
            </div>

            <ScrollArea className="h-full pr-3">
              <div className="space-y-3 pb-20">
                {notificationError ? (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                    {notificationError}
                  </div>
                ) : notifications.length ? (
                  notifications.map((notification) => {
                    const key = notification.type?.toLowerCase() ?? 'info';
                    const accentClass = accentClasses[key as keyof typeof accentClasses] ?? 'border-white/20 text-slate-200';
                    const isUnread = !notification.isRead;

                    return (
                      <div
                        key={notification.id}
                        className={`rounded-2xl border p-4 backdrop-blur transition-all duration-200 hover:border-blue-500/40 hover:bg-white/10 ${
                          isUnread
                            ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_24px_65px_-38px_rgba(37,99,235,0.9)]'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-300/80">
                              {notification.message}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`border ${accentClass} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]`}
                          >
                            {notification.type}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400/75">
                          <span>{formatRelativeTime(notification.createdAt)}</span>
                          {isUnread ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              New
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : isLoadingNotifications ? (
                  <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-center text-sm text-slate-400">
                    Loading notifications…
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-center text-sm text-slate-400">
                    You&apos;re all caught up.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
              <Button
                variant="outline"
                className="border-white/15 text-slate-200 hover:border-blue-500/40 hover:text-white"
                disabled
              >
                Notification Preferences
              </Button>
              <Button
                variant="ghost"
                className="text-sm text-slate-300 hover:text-white"
                onClick={() => setIsNotificationOpen(false)}
              >
                Close
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {user && (
          <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300/80 md:flex">
            <span className="font-semibold text-white">Semester {user.semester}</span>
            <span className="text-slate-400/70">·</span>
            <span>{user.program}</span>
          </div>
        )}

        <AuthMenu />
      </div>
    </header>
  );
}
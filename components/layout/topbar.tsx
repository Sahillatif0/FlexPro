'use client';

import { Bell, Search, Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store';
import { AuthMenu } from '@/components/auth/auth-menu';

export function Topbar() {
  const { toggleSidebar, user } = useAppStore();

  return (
    <header className="relative z-30 flex h-20 items-center gap-4 border-b border-white/10 bg-[#050915]/85 px-4 backdrop-blur-2xl sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
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

      <div className="flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400/70" />
          <Input
            placeholder="Search courses, deadlines, resources..."
            className="student-input h-11 w-full pl-12 pr-4"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-blue-500/50 hover:text-white sm:flex"
        >
          <Sparkles className="h-4 w-4 text-emerald-400" />
          Quick Actions
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300/80 transition-colors hover:border-blue-500/40 hover:text-white"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]"></span>
        </Button>

        {user && (
          <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300/80 sm:flex">
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
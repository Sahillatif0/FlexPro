'use client';

import { Bell, Search, Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store';
import { AuthMenu } from '@/components/auth/auth-menu';

export function Topbar() {
  const { toggleSidebar, user } = useAppStore();

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

        <Button
          variant="ghost"
          size="sm"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300/80 transition-colors hover:border-blue-500/40 hover:text-white"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]"></span>
        </Button>

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
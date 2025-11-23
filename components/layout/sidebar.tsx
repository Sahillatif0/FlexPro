'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Wallet,
  FileText,
  MessageSquare,
  Edit3,
  CalendarRange,
  BarChart3,
  User,
  Settings,
  LogOut,
  Menu,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Attendance', href: '/attendance', icon: CalendarRange },
  { name: 'Marks', href: '/marks', icon: Award },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Enrollment', href: '/enroll', icon: ClipboardCheck },
  { name: 'Transcript', href: '/transcript', icon: FileText },
  { name: 'Fees', href: '/fees', icon: Wallet },
  { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  { name: 'Grade Requests', href: '/grade-request', icon: Edit3 },
  { name: 'Study Plan', href: '/study-plan', icon: BarChart3 },
  { name: 'Profile', href: '/profile', icon: User },
];

const accentGradients = [
  'from-blue-500/90 via-indigo-500/80 to-sky-500/80',
  'from-emerald-500/85 via-teal-500/80 to-green-500/80',
  'from-fuchsia-500/80 via-purple-500/80 to-pink-500/80',
  'from-amber-500/85 via-orange-500/80 to-rose-500/80',
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, user, logout } = useAppStore();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden',
          sidebarCollapsed ? 'hidden' : 'block'
        )}
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-72 border-r border-white/10 bg-[#050a16]/95 backdrop-blur-2xl shadow-[0_25px_80px_-45px_rgba(56,189,248,0.55)] transition-transform duration-300 lg:static lg:inset-0 lg:translate-x-0',
          sidebarCollapsed ? '-translate-x-full lg:w-20' : 'translate-x-0'
        )}
        role="navigation"
        aria-label="Student Portal"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-6 border-b border-white/10">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/90 to-indigo-500/90 text-white font-semibold shadow-[0_10px_35px_-10px_rgba(59,130,246,0.8)]">
                  <span>F</span>
                </div>
                <div>
                  <p className="text-base font-semibold tracking-wide text-white">FlexPro</p>
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400/80">
                    Student Portal
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="text-slate-300/80 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* User info */}
          {user && !sidebarCollapsed && (
            <div className="px-5 py-5 border-b border-white/10">
              <div className="student-surface px-4 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <User className="h-5 w-5 text-white/90" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-300/70">
                      {user.studentId}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300/80">
                  Semester {user.semester} · {user.program}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="student-scroll flex-1 space-y-2 overflow-y-auto pl-4 pr-2 py-6">
            {navigation.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const accent = accentGradients[index % accentGradients.length];

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center overflow-hidden rounded-2xl px-4 py-3 text-sm font-medium tracking-wide transition-all',
                    sidebarCollapsed && 'justify-center px-0',
                    isActive
                      ? cn('text-white shadow-[0_18px_45px_-30px_rgba(59,130,246,0.9)]', 'bg-gradient-to-r', accent)
                      : 'text-slate-300/80 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200 transition-all',
                      isActive && 'bg-white/15 text-white',
                      !sidebarCollapsed && 'mr-3'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {!sidebarCollapsed && (
                    <span className="relative z-[1]">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="space-y-2 border-t border-white/10 px-4 py-5">
            <Link
              href="/settings"
              className={cn(
                'flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-300/80 transition-all hover:bg-white/5 hover:text-white',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200',
                  !sidebarCollapsed && 'mr-3'
                )}
              >
                <Settings className="h-4 w-4" />
              </span>
              {!sidebarCollapsed && 'Settings'}
            </Link>
            <button
              onClick={logout}
              className={cn(
                'flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-300/80 transition-all hover:bg-white/5 hover:text-white',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200',
                  !sidebarCollapsed && 'mr-3'
                )}
              >
                <LogOut className="h-4 w-4" />
              </span>
              {!sidebarCollapsed && 'Logout'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
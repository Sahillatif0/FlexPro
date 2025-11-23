"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookMarked,
  Users,
  GraduationCap,
  Settings,
  LogOut,
  Menu,
  UserPlus,
  UserCog,
  PlusCircle,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigationSections = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        description: "Key metrics, trends, and recent platform activity",
      },
    ],
  },
  {
    title: "Academics",
    items: [
      {
        name: "Courses",
        href: "/admin/courses",
        icon: BookMarked,
        description: "Manage curricula, cohorts, and publishing status",
      },
      {
        name: "Add Course",
        href: "/admin/courses/new",
        icon: PlusCircle,
        badge: "New",
        description: "Spin up a new course with modules and instructors",
      },
      {
        name: "Notifications",
        href: "/admin/notifications",
        icon: Megaphone,
        description: "Create announcements and review engagement",
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        name: "Students",
        href: "/admin/students",
        icon: Users,
        description: "Track enrollment pipelines and learner progress",
      },
      {
        name: "Register Student",
        href: "/admin/students/register",
        icon: UserPlus,
        description: "Onboard a new learner or transfer request",
      },
      {
        name: "Faculty",
        href: "/admin/faculty",
        icon: GraduationCap,
        description: "Coordinate faculty schedules and assignments",
      },
      {
        name: "Register Faculty",
        href: "/admin/faculty/register",
        icon: UserCog,
        description: "Invite a new instructor or staff member",
      },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, user, logout } = useAppStore();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden",
          sidebarCollapsed ? "hidden" : "block"
        )}
        onClick={toggleSidebar}
      />

      <div
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 transform flex-col border-r border-white/10 bg-slate-950/80 shadow-2xl shadow-purple-900/10 backdrop-blur-xl transition-all duration-300 lg:static lg:inset-0 lg:translate-x-0",
          sidebarCollapsed ? "-translate-x-full lg:w-20 lg:px-2" : "translate-x-0 lg:px-4"
        )}
      >
        <div className="relative flex h-full flex-col">
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-950 to-transparent px-4 py-5 shadow-lg shadow-purple-900/10">
            <div
              className={cn(
                "flex items-center justify-between",
                sidebarCollapsed && "flex-col gap-4 lg:flex-col lg:gap-4"
              )}
            >
              {sidebarCollapsed ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 text-sm font-semibold text-white">
                  FP
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 text-sm font-semibold text-white">
                    FP
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">FlexPro Admin</p>
                    <p className="text-xs text-slate-400">Control center</p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="text-slate-400 hover:text-white"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Menu
                  className={cn(
                    "h-5 w-5 transition-transform",
                    sidebarCollapsed && "rotate-180"
                  )}
                />
              </Button>
            </div>
          </div>

          {user && !sidebarCollapsed && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-inner shadow-purple-900/5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-sm font-semibold text-white">
                  {user.firstName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user.employeeId ?? "Administrator"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <TooltipProvider delayDuration={0}>
            <nav className="mt-6 flex-1 overflow-y-auto pr-1">
              <div className="space-y-6 pb-16">
                {navigationSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    {!sidebarCollapsed && (
                      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {section.title}
                      </p>
                    )}
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        const linkContent = (
                          <Link
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                              "before:absolute before:left-1 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-transparent",
                              isActive
                                ? "bg-gradient-to-r from-purple-500/75 via-indigo-500/75 to-blue-500/60 text-white shadow-lg shadow-purple-900/20 before:bg-indigo-300"
                                : "text-slate-300 hover:bg-white/5 hover:text-white hover:before:bg-white/40",
                              sidebarCollapsed && "justify-center px-2"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5 shrink-0 transition-transform duration-300",
                                isActive ? "scale-110" : "group-hover:scale-105"
                              )}
                            />
                            {!sidebarCollapsed && (
                              <div className="flex flex-1 items-center justify-between gap-3">
                                <span className="truncate">{item.name}</span>
                                {item.badge && (
                                  <Badge variant="secondary" className="bg-white/10 text-white">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </Link>
                        );

                        return sidebarCollapsed ? (
                          <Tooltip key={item.name}>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right" sideOffset={12} className="max-w-xs bg-slate-950/90 text-slate-100">
                              <p className="text-sm font-medium text-white">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-slate-300">{item.description}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div key={item.name}>{linkContent}</div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          </TooltipProvider>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-inner shadow-purple-900/5">
            <Link
              href="/admin/settings"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white",
                sidebarCollapsed && "justify-center"
              )}
            >
              <Settings className={cn("h-5 w-5", sidebarCollapsed ? "" : "text-slate-300")} />
              {!sidebarCollapsed && <span>Settings</span>}
            </Link>
            <button
              onClick={logout}
              className={cn(
                "mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-white",
                sidebarCollapsed && "justify-center"
              )}
            >
              <LogOut className="h-5 w-5" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-4 text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Need a hand?
              </p>
              <p className="mt-2 text-sm text-slate-200">
                Explore the support center for workflows, automations, and onboarding guides.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-3 w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/admin/settings#support">Open support hub</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { Menu, Plus, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { AuthMenu } from "@/components/auth/auth-menu";

export function AdminTopbar() {
  const { toggleSidebar, user } = useAppStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/10 bg-slate-950/60 px-4 backdrop-blur-lg supports-[backdrop-filter]:bg-slate-950/40 lg:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-white lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-4">
        <div className="relative hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 shadow-sm shadow-purple-900/10 sm:inline-flex">
          <span>Admin control panel</span>
        </div>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search courses, users, or actions"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 text-white placeholder:text-slate-400 focus:border-purple-500 focus:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          asChild
          className="hidden h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 px-4 text-sm font-semibold text-white shadow-lg shadow-purple-900/20 transition hover:from-purple-400 hover:via-indigo-400 hover:to-blue-400 sm:flex"
        >
          <Link href="/admin/courses/new">
            <Plus className="h-4 w-4" />
            New course
          </Link>
        </Button>

        {user ? (
          <div className="hidden text-sm leading-tight sm:block">
            <p className="font-medium text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="flex items-center justify-end gap-1 text-xs text-slate-400">
              <Shield className="h-3 w-3" />
              {user.employeeId ?? "Administrator"}
            </p>
          </div>
        ) : null}

        <AuthMenu />
      </div>
    </header>
  );
}

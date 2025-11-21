"use client";

import { Menu, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { AuthMenu } from "@/components/auth/auth-menu";

export function AdminTopbar() {
  const { toggleSidebar, user } = useAppStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 px-4 lg:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden text-gray-400 hover:text-white"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search courses, users, or actions"
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <div className="text-right">
              <p className="text-white font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-gray-400 text-xs flex items-center gap-1 justify-end">
                <Shield className="h-3 w-3" />
                {user.employeeId ?? "Administrator"}
              </p>
            </div>
          </div>
        )}

        <AuthMenu />
      </div>
    </header>
  );
}

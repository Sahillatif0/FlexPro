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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Courses", href: "/admin/courses", icon: BookMarked },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Faculty", href: "/admin/faculty", icon: GraduationCap },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, user, logout } = useAppStore();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden",
          sidebarCollapsed ? "hidden" : "block"
        )}
        onClick={toggleSidebar}
      />

      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0",
          sidebarCollapsed ? "-translate-x-full lg:w-16" : "translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-white font-semibold text-lg">FlexPro Admin</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {user && !sidebarCollapsed && (
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-gray-300 text-sm font-semibold">{user.firstName.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.employeeId ?? "Administrator"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-purple-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white",
                    sidebarCollapsed && "justify-center"
                  )}
                >
                  <Icon className={cn("h-5 w-5", !sidebarCollapsed && "mr-3")} />
                  {!sidebarCollapsed && item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-800 space-y-2">
            <Link
              href="/admin/settings"
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors",
                sidebarCollapsed && "justify-center"
              )}
            >
              <Settings className={cn("h-5 w-5", !sidebarCollapsed && "mr-3")} />
              {!sidebarCollapsed && "Settings"}
            </Link>
            <button
              onClick={logout}
              className={cn(
                "w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors",
                sidebarCollapsed && "justify-center"
              )}
            >
              <LogOut className={cn("h-5 w-5", !sidebarCollapsed && "mr-3")} />
              {!sidebarCollapsed && "Logout"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store';

export function Topbar() {
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
            placeholder="Search..."
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
        </Button>

        {user && (
          <div className="flex items-center gap-2 text-sm">
            <div className="text-right">
              <p className="text-white font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-gray-400 text-xs">
                Semester {user.semester}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
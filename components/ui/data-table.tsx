'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKey?: keyof T;
  pageSize?: number;
  emptyMessage?: string;
  isLoading?: boolean;
  skeletonRows?: number;
  hideSearchWhileLoading?: boolean;
  skeletonColumns?: number;
  showEmptyState?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchKey,
  pageSize = 10,
  emptyMessage = 'No data available',
  isLoading = false,
  skeletonRows = 6,
  hideSearchWhileLoading = false,
  skeletonColumns,
  showEmptyState = true,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery || !searchKey) return data;
    
    return data.filter((item) =>
      String(item[searchKey])
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery, searchKey, searchable]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="space-y-4">
      {searchable && searchKey && (!hideSearchWhileLoading || !isLoading) && (
        <div className="group relative max-w-sm">
          <div className="pointer-events-none absolute -inset-[1px] rounded-[1.05rem] bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-blue-500/20 opacity-0 blur-[1px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
          <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-[#0b1220]/80 backdrop-blur">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400/70 transition-colors duration-300 group-focus-within:text-blue-200 group-hover:text-blue-200" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-[1rem] border border-transparent bg-transparent pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
            <TableRow className="border-white/10 bg-white/5 text-slate-300/80">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-[0.25em] text-slate-400/70',
                    column.sortable && 'cursor-pointer hover:text-white'
                  )}
                  onClick={column.sortable ? () => handleSort(String(column.key)) : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.title}</span>
                    {column.sortable && sortConfig?.key === column.key && (
                      <span className="text-xs font-medium text-white">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
            <TableBody>
              {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, rowIndex) => {
                const columnCount = Math.max(skeletonColumns ?? columns.length, 1);
                return (
                  <TableRow key={`skeleton-${rowIndex}`} className="border-white/10">
                    {Array.from({ length: columnCount }).map((__, columnIndex) => (
                      <TableCell key={`skeleton-cell-${rowIndex}-${columnIndex}`} className="py-4">
                        <Skeleton className="h-4 w-full max-w-[220px] rounded-full bg-white/10" />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
              ) : paginatedData.length > 0 ? (
              paginatedData.map((item: T, index: number) => {
                const rowKey = (item as any)?.id ?? index;
                return (
                  <TableRow key={rowKey} className="border-white/10 text-slate-200 hover:bg-white/5">
                    {columns.map((column) => (
                      <TableCell key={String(column.key)} className="py-4 text-sm text-slate-200/85">
                        {column.render
                          ? column.render(item[column.key as keyof T], item)
                          : String(item[column.key as keyof T] || '')}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
              ) : showEmptyState ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length || skeletonColumns || 1}
                  className="py-10 text-center text-sm text-slate-400/70"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400/75">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
            {sortedData.length} results
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-xl border-white/10 text-slate-200 hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-400/75">
              {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-xl border-white/10 text-slate-200 hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
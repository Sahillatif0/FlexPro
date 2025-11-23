'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, CheckCircle2, Clock, FileText, ShieldAlert, XCircle } from 'lucide-react';

interface GradeRequestItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  studentSection: string | null;
  courseCode: string;
  courseTitle: string;
  termId: string;
  termName: string | null;
  currentGrade: string;
  requestedGrade: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

interface FacultyGradeRequestsResponse {
  gradeRequests: GradeRequestItem[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  filters: {
    courses: Array<{ courseId: string; courseCode: string; courseTitle: string }>;
    terms: Array<{ id: string; name: string }>;
    statuses: string[];
  };
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

type CourseFilter = 'all' | string;

type TermFilter = 'all' | string;

export default function FacultyGradeRequestsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<FacultyGradeRequestsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('all');
  const [termFilter, setTermFilter] = useState<TermFilter>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<GradeRequestItem | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/faculty/grade-requests');
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Failed to load grade requests');
      }
      const payload = (await response.json()) as FacultyGradeRequestsResponse;
      setData(payload);
    } catch (err: any) {
      console.error('Faculty grade requests fetch failed', err);
      const message = err?.message ?? 'Failed to load grade requests';
      setError(message);
      toast({
        title: 'Unable to load grade requests',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    if (!data) {
      return [] as GradeRequestItem[];
    }

    return data.gradeRequests.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (courseFilter !== 'all' && item.courseCode !== courseFilter) {
        return false;
      }

      if (termFilter !== 'all' && item.termId !== termFilter) {
        return false;
      }

      return true;
    });
  }, [data, statusFilter, courseFilter, termFilter]);

  const openDialog = (item: GradeRequestItem) => {
    setSelectedRequest(item);
    setNotes(item.notes ?? '');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedRequest(null);
    setNotes('');
  };

  const handleStatusChange = async (nextStatus: 'pending' | 'approved' | 'rejected') => {
    if (!selectedRequest) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/faculty/grade-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus, notes }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Failed to update grade request');
      }

      toast({
        title: 'Grade request updated',
        description: `Status set to ${nextStatus}.`,
      });

      closeDialog();
      await fetchRequests();
    } catch (err: any) {
      console.error('Faculty grade request update failed', err);
      toast({
        title: 'Unable to update request',
        description: err?.message ?? 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'studentName',
      title: 'Student',
      render: (_value: unknown, item: GradeRequestItem) => (
        <div className="flex flex-col">
          <span className="text-white font-medium">{item.studentName}</span>
          {item.studentEmail ? (
            <span className="text-xs text-gray-400">{item.studentEmail}</span>
          ) : null}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'courseCode',
      title: 'Course',
      render: (_value: unknown, item: GradeRequestItem) => (
        <div className="flex flex-col">
          <span className="text-blue-400 font-mono">{item.courseCode}</span>
          <span className="text-xs text-gray-400">{item.courseTitle}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'currentGrade',
      title: 'Current',
      render: (value: string, _item: GradeRequestItem) => (
        <Badge variant="secondary">{value}</Badge>
      ),
    },
    {
      key: 'requestedGrade',
      title: 'Requested',
      render: (value: string, _item: GradeRequestItem) => (
        <Badge variant="outline" className="border-emerald-500 text-emerald-400">
          {value}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: GradeRequestItem['status'], _item: GradeRequestItem) => (
        <div className="flex items-center gap-2">
          {value === 'approved' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : value === 'rejected' ? (
            <XCircle className="h-4 w-4 text-red-400" />
          ) : (
            <Clock className="h-4 w-4 text-amber-400" />
          )}
          <Badge
            className={
              value === 'approved'
                ? 'bg-emerald-600'
                : value === 'rejected'
                ? 'bg-red-600'
                : 'bg-amber-500 text-black'
            }
          >
            {value}
          </Badge>
        </div>
      ),
    },
    {
      key: 'submittedAt',
      title: 'Submitted',
      render: (value: string, _item: GradeRequestItem) => (
        <span className="text-sm text-gray-400">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value: unknown, item: GradeRequestItem) => (
        <Button variant="ghost" size="sm" className="text-blue-400" onClick={() => openDialog(item)}>
          <FileText className="h-4 w-4 mr-2" />
          Review
        </Button>
      ),
    },
  ];

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-emerald-400" />
          Grade Requests
        </h1>
        <p className="text-sm text-gray-400">
          Review and respond to grade change requests submitted by your students.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load grade requests</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-gray-900 border-gray-800">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-24 bg-gray-800" />
                <Skeleton className="h-8 w-16 bg-gray-800" />
                <Skeleton className="h-3 w-20 bg-gray-800" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Requests</p>
                    <p className="text-3xl font-bold text-white">{summary.total}</p>
                  </div>
                  <ClipboardList className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending</p>
                    <p className="text-3xl font-bold text-white">{summary.pending}</p>
                  </div>
                  <Clock className="h-10 w-10 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Approved</p>
                    <p className="text-3xl font-bold text-white">{summary.approved}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Rejected</p>
                    <p className="text-3xl font-bold text-white">{summary.rejected}</p>
                  </div>
                  <ShieldAlert className="h-10 w-10 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2 min-w-[180px]">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Status</span>
                <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Course</span>
                <Select value={courseFilter} onValueChange={(value: CourseFilter) => setCourseFilter(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all">All Courses</SelectItem>
                    {data?.filters.courses.map((course) => (
                      <SelectItem key={course.courseCode} value={course.courseCode}>
                        {course.courseCode} · {course.courseTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Term</span>
                <Select value={termFilter} onValueChange={(value: TermFilter) => setTermFilter(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all">All Terms</SelectItem>
                    {data?.filters.terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Showing {filteredRequests.length} of {data?.summary.total ?? 0} requests
            </div>
          </div>

          <Separator className="bg-gray-800" />

          <DataTable<GradeRequestItem>
            data={filteredRequests}
            columns={columns}
            searchKey="studentName"
            emptyMessage={isLoading ? 'Loading requests…' : 'No grade requests found'}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setIsDialogOpen(true))}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Student</p>
                  <p className="text-white font-medium">{selectedRequest.studentName}</p>
                  {selectedRequest.studentEmail ? (
                    <p className="text-xs text-gray-400">{selectedRequest.studentEmail}</p>
                  ) : null}
                  {selectedRequest.studentSection ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Section {selectedRequest.studentSection}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Course</p>
                  <p className="text-white font-medium">
                    {selectedRequest.courseCode} · {selectedRequest.courseTitle}
                  </p>
                  {selectedRequest.termName ? (
                    <p className="text-xs text-gray-400 mt-1">{selectedRequest.termName}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Current Grade</p>
                  <Badge variant="secondary" className="mt-1">
                    {selectedRequest.currentGrade}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Requested Grade</p>
                  <Badge variant="outline" className="mt-1 border-emerald-500 text-emerald-400">
                    {selectedRequest.requestedGrade}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Submitted</p>
                  <p className="text-sm text-gray-300 mt-1">
                    {new Date(selectedRequest.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Student Rationale</p>
                <p className="text-sm text-gray-200 bg-gray-800/60 rounded-lg p-4 mt-2 whitespace-pre-line">
                  {selectedRequest.reason}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Faculty Notes</p>
                  <Badge variant="outline" className="border-gray-700 text-gray-300">
                    Current status: {selectedRequest.status}
                  </Badge>
                </div>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add notes or justification for your decision"
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={4}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => handleStatusChange('pending')}
              disabled={isSubmitting}
            >
              Mark Pending
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => handleStatusChange('rejected')}
              disabled={isSubmitting}
            >
              Reject
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleStatusChange('approved')}
              disabled={isSubmitting}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

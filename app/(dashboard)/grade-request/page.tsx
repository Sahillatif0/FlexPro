'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface GradeRequestItem {
  id: string;
  courseCode: string;
  courseName: string;
  currentGrade: string;
  requestedGrade: string;
  reason: string;
  status: string;
  adminNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  termId: string;
  term: string | null;
}

interface GradeRequestSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface CourseOption {
  courseCode: string;
  courseName: string;
  termId: string;
  termName: string;
}

interface TermOption {
  id: string;
  name: string;
}

export default function GradeRequestPage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [gradeRequests, setGradeRequests] = useState<GradeRequestItem[]>([]);
  const [summary, setSummary] = useState<GradeRequestSummary | null>(null);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [termOptions, setTermOptions] = useState<TermOption[]>([]);
  const [selectedCourseKey, setSelectedCourseKey] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [currentGrade, setCurrentGrade] = useState('');
  const [requestedGrade, setRequestedGrade] = useState('');
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    async function loadRequests() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/grade-requests?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load grade requests');
        }

        const payload = (await response.json()) as {
          gradeRequests: GradeRequestItem[];
          courseOptions: CourseOption[];
          termOptions: TermOption[];
          summary: GradeRequestSummary;
        };

        setGradeRequests(payload.gradeRequests);
        setCourseOptions(payload.courseOptions);
        setTermOptions(payload.termOptions);
        setSummary(payload.summary);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Grade request fetch error', err);
        setError(err.message || 'Failed to load grade requests');
        toast({
          title: 'Unable to load grade requests',
          description: err.message || 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadRequests();
    return () => controller.abort();
  }, [toast, user]);

  const resetForm = () => {
    setSelectedCourseKey('');
    setSelectedTerm('');
    setCurrentGrade('');
    setRequestedGrade('');
    setReason('');
  };

  const handleSubmitRequest = async () => {
    if (!user) return;
    const [courseCode, inferredTermId] = selectedCourseKey.split('|');
    const termId = selectedTerm || inferredTermId;

    if (!courseCode || !termId || !currentGrade || !requestedGrade || !reason) {
      toast({
        title: 'Incomplete request',
        description: 'Please fill in all required fields before submitting.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/grade-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          courseCode,
          currentGrade,
          requestedGrade,
          reason,
          termId,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || 'Failed to submit grade request');
      }

      toast({
        title: 'Request submitted',
        description: 'Your grade change request has been submitted for review.',
      });

      setIsDialogOpen(false);
      resetForm();

      // Re-fetch to get latest data
      const params = new URLSearchParams({ userId: user.id });
      const refreshed = await fetch(`/api/grade-requests?${params.toString()}`);
      if (refreshed.ok) {
        const payload = (await refreshed.json()) as {
          gradeRequests: GradeRequestItem[];
          courseOptions: CourseOption[];
          termOptions: TermOption[];
          summary: GradeRequestSummary;
        };
        setGradeRequests(payload.gradeRequests);
        setCourseOptions(payload.courseOptions);
        setTermOptions(payload.termOptions);
        setSummary(payload.summary);
      }
    } catch (err: any) {
      console.error('Grade request submission error', err);
      toast({
        title: 'Unable to submit request',
        description: err.message || 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-400" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'courseCode',
        title: 'Course Code',
        render: (value: string) => (
          <span className="font-mono text-blue-400">{value}</span>
        ),
        sortable: true,
      },
      {
        key: 'courseName',
        title: 'Course Name',
        render: (value: string) => (
          <span className="font-medium text-white">{value}</span>
        ),
        sortable: true,
      },
      {
        key: 'currentGrade',
        title: 'Current Grade',
        render: (value: string) => <Badge variant="secondary">{value}</Badge>,
      },
      {
        key: 'requestedGrade',
        title: 'Requested Grade',
        render: (value: string) => (
          <Badge variant="outline" className="border-emerald-500 text-emerald-400">
            {value}
          </Badge>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        render: (value: string, item: GradeRequestItem) => (
          <div className="flex items-center gap-2">
            {getStatusIcon(value)}
            <Badge
              variant={
                value === 'approved'
                  ? 'default'
                  : value === 'pending'
                  ? 'secondary'
                  : 'destructive'
              }
              className={
                value === 'approved'
                  ? 'bg-emerald-600'
                  : value === 'pending'
                  ? 'bg-amber-600'
                  : ''
              }
            >
              {value}
            </Badge>
            {item.term ? (
              <span className="text-xs text-gray-400">{item.term}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'submittedAt',
        title: 'Submitted',
        render: (value: string) => (
          <span className="text-gray-400 text-sm">
            {new Date(value).toLocaleDateString()}
          </span>
        ),
        sortable: true,
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_value: unknown, item: GradeRequestItem) => (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                <FileText className="h-3 w-3 mr-1" />
                View
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Grade Request Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Course</p>
                    <p className="text-white font-medium">
                      {item.courseCode} - {item.courseName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <Badge
                        variant={
                          item.status === 'approved'
                            ? 'default'
                            : item.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className={
                          item.status === 'approved'
                            ? 'bg-emerald-600'
                            : item.status === 'pending'
                            ? 'bg-amber-600'
                            : ''
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Current Grade</p>
                    <Badge variant="secondary">{item.currentGrade}</Badge>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Requested Grade</p>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-400">
                      {item.requestedGrade}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Reason</p>
                  <p className="text-white bg-gray-700 p-3 rounded-lg mt-1">{item.reason}</p>
                </div>
                {item.adminNotes ? (
                  <div>
                    <p className="text-gray-400 text-sm">Admin Notes</p>
                    <p className="text-white bg-gray-700 p-3 rounded-lg mt-1">{item.adminNotes}</p>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Submitted</p>
                    <p className="text-white">{new Date(item.submittedAt).toLocaleDateString()}</p>
                  </div>
                  {item.reviewedAt ? (
                    <div>
                      <p className="text-gray-400">Reviewed</p>
                      <p className="text-white">{new Date(item.reviewedAt).toLocaleDateString()}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ),
      },
    ],
    []
  );

  if (!user) {
    return <p className="text-gray-300">Sign in to view grade requests.</p>;
  }

  const totalRequests = summary?.total ?? 0;
  const pendingRequests = summary?.pending ?? 0;
  const approvedRequests = summary?.approved ?? 0;
  const rejectedRequests = summary?.rejected ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Grade Change Requests</h1>
          <p className="text-gray-400">Submit and track your grade change requests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Submit Grade Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm font-medium">Course</label>
                <Select
                  value={selectedCourseKey}
                  onValueChange={(value) => {
                    setSelectedCourseKey(value);
                    const [, termId] = value.split('|');
                    if (termId) {
                      setSelectedTerm(termId);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                    {courseOptions.map((course) => (
                      <SelectItem
                        key={`${course.courseCode}|${course.termId}`}
                        value={`${course.courseCode}|${course.termId}`}
                        className="text-white"
                      >
                        {course.courseCode} - {course.courseName} ({course.termName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Term</label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {termOptions.map((term) => (
                      <SelectItem key={term.id} value={term.id} className="text-white">
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium">Current Grade</label>
                  <Select value={currentGrade} onValueChange={setCurrentGrade}>
                    <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'].map((grade) => (
                        <SelectItem key={grade} value={grade} className="text-white">
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium">Requested Grade</label>
                  <Select value={requestedGrade} onValueChange={setRequestedGrade}>
                    <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'].map((grade) => (
                        <SelectItem key={grade} value={grade} className="text-white">
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Reason for Request</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the reason for your grade change request..."
                  className="mt-1 bg-gray-700 border-gray-600 text-white"
                  rows={4}
                />
              </div>
              <Button
                onClick={handleSubmitRequest}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={
                  isSubmitting ||
                  !selectedCourseKey ||
                  !selectedTerm ||
                  !currentGrade ||
                  !requestedGrade ||
                  !reason
                }
              >
                {isSubmitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading && !summary ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-28 bg-gray-700" />
                  <Skeleton className="h-6 w-24 bg-gray-700" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Requests</p>
                    <p className="text-2xl font-bold text-white">{totalRequests}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending</p>
                    <p className="text-2xl font-bold text-amber-400">{pendingRequests}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Approved</p>
                    <p className="text-2xl font-bold text-emerald-400">{approvedRequests}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Rejected</p>
                    <p className="text-2xl font-bold text-red-400">{rejectedRequests}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Requests Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Grade Change Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid grid-cols-4 items-center gap-4">
                  <Skeleton className="h-4 w-full bg-gray-700" />
                  <Skeleton className="h-4 w-full bg-gray-700" />
                  <Skeleton className="h-4 w-24 bg-gray-700" />
                  <Skeleton className="h-8 w-20 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              data={gradeRequests}
              columns={columns}
              searchKey="courseCode"
              emptyMessage="No grade requests submitted"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
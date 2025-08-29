'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function GradeRequestPage() {
  const [courseCode, setCourseCode] = useState('');
  const [currentGrade, setCurrentGrade] = useState('');
  const [requestedGrade, setRequestedGrade] = useState('');
  const [reason, setReason] = useState('');

  // Mock data
  const gradeRequests = [
    {
      id: '1',
      courseCode: 'CS-399',
      courseName: 'Web Engineering',
      currentGrade: 'B+',
      requestedGrade: 'A-',
      reason: 'Assignment grading discrepancy in final project submission',
      status: 'pending',
      submittedAt: '2024-12-15',
      reviewedAt: null,
      adminNotes: null,
    },
    {
      id: '2',
      courseCode: 'CS-397',
      courseName: 'Mobile Computing',
      currentGrade: 'B',
      requestedGrade: 'B+',
      reason: 'Quiz scores not properly calculated in final grade',
      status: 'approved',
      submittedAt: '2024-11-20',
      reviewedAt: '2024-11-25',
      adminNotes: 'Grade updated after recalculation. Quiz scores were indeed missing.',
    },
    {
      id: '3',
      courseCode: 'MT-301',
      courseName: 'Linear Algebra',
      currentGrade: 'C+',
      requestedGrade: 'B-',
      reason: 'Midterm paper re-evaluation request',
      status: 'rejected',
      submittedAt: '2024-10-10',
      reviewedAt: '2024-10-18',
      adminNotes: 'After re-evaluation, original grade confirmed as correct.',
    },
  ];

  const handleSubmitRequest = () => {
    // Mock submission
    console.log('Grade request submitted:', { courseCode, currentGrade, requestedGrade, reason });
    setCourseCode('');
    setCurrentGrade('');
    setRequestedGrade('');
    setReason('');
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

  const columns = [
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
      render: (value: string) => (
        <Badge variant="secondary">{value}</Badge>
      ),
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
      render: (value: string) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(value)}
          <Badge
            variant={
              value === 'approved' ? 'default' :
              value === 'pending' ? 'secondary' :
              'destructive'
            }
            className={
              value === 'approved' ? 'bg-emerald-600' :
              value === 'pending' ? 'bg-amber-600' : ''
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
      render: (value: any, item: any) => (
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
                  <p className="text-white font-medium">{item.courseCode} - {item.courseName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <Badge
                      variant={
                        item.status === 'approved' ? 'default' :
                        item.status === 'pending' ? 'secondary' :
                        'destructive'
                      }
                      className={
                        item.status === 'approved' ? 'bg-emerald-600' :
                        item.status === 'pending' ? 'bg-amber-600' : ''
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
              {item.adminNotes && (
                <div>
                  <p className="text-gray-400 text-sm">Admin Notes</p>
                  <p className="text-white bg-gray-700 p-3 rounded-lg mt-1">{item.adminNotes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Submitted</p>
                  <p className="text-white">{new Date(item.submittedAt).toLocaleDateString()}</p>
                </div>
                {item.reviewedAt && (
                  <div>
                    <p className="text-gray-400">Reviewed</p>
                    <p className="text-white">{new Date(item.reviewedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Grade Change Requests</h1>
          <p className="text-gray-400">Submit and track your grade change requests</p>
        </div>
        <Dialog>
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
                <label className="text-gray-300 text-sm font-medium">Course Code</label>
                <Input
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g., CS-401"
                  className="mt-1 bg-gray-700 border-gray-600 text-white"
                />
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
                disabled={!courseCode || !currentGrade || !requestedGrade || !reason}
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Requests</p>
                <p className="text-2xl font-bold text-white">{gradeRequests.length}</p>
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
                <p className="text-2xl font-bold text-amber-400">
                  {gradeRequests.filter(r => r.status === 'pending').length}
                </p>
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
                <p className="text-2xl font-bold text-emerald-400">
                  {gradeRequests.filter(r => r.status === 'approved').length}
                </p>
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
                <p className="text-2xl font-bold text-red-400">
                  {gradeRequests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Grade Change Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={gradeRequests}
            columns={columns}
            searchKey="courseCode"
            emptyMessage="No grade requests submitted"
          />
        </CardContent>
      </Card>
    </div>
  );
}
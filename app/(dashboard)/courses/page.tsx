'use client';

import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Clock, TrendingUp } from 'lucide-react';

export default function CoursesPage() {
  // Mock data
  const courses = [
    {
      id: '1',
      code: 'CS-401',
      title: 'Software Engineering',
      instructor: 'Dr. Ahmed Ali',
      creditHours: 3,
      schedule: 'MWF 09:00-10:00',
      room: 'CS-Lab-1',
      enrolled: 45,
      capacity: 50,
      status: 'enrolled'
    },
    {
      id: '2',
      code: 'CS-403',
      title: 'Database Systems',
      instructor: 'Prof. Sarah Khan',
      creditHours: 4,
      schedule: 'TTh 11:00-12:30',
      room: 'LR-204',
      enrolled: 38,
      capacity: 40,
      status: 'enrolled'
    },
    {
      id: '3',
      code: 'CS-405',
      title: 'Computer Networks',
      instructor: 'Dr. Hassan Shah',
      creditHours: 3,
      schedule: 'MWF 14:00-15:00',
      room: 'LR-301',
      enrolled: 42,
      capacity: 45,
      status: 'enrolled'
    },
    {
      id: '4',
      code: 'MT-401',
      title: 'Calculus III',
      instructor: 'Dr. Fatima Malik',
      creditHours: 3,
      schedule: 'TTh 08:00-09:30',
      room: 'LR-105',
      enrolled: 35,
      capacity: 40,
      status: 'enrolled'
    },
  ];

  const columns = [
    {
      key: 'code',
      title: 'Course Code',
      render: (value: string) => (
        <span className="font-mono text-blue-400">{value}</span>
      ),
      sortable: true,
    },
    {
      key: 'title',
      title: 'Course Title',
      render: (value: string) => (
        <span className="font-medium text-white">{value}</span>
      ),
      sortable: true,
    },
    {
      key: 'instructor',
      title: 'Instructor',
      sortable: true,
    },
    {
      key: 'creditHours',
      title: 'Credit Hours',
      render: (value: number) => (
        <Badge variant="outline" className="border-gray-600 text-gray-300">
          {value} CR
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'schedule',
      title: 'Schedule',
      render: (value: string) => (
        <span className="text-sm text-gray-400">{value}</span>
      ),
    },
    {
      key: 'room',
      title: 'Room',
      render: (value: string) => (
        <span className="text-sm text-gray-400">{value}</span>
      ),
    },
    {
      key: 'capacity',
      title: 'Enrollment',
      render: (value: number, item: any) => (
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Users className="h-3 w-3" />
          <span>{item.enrolled}/{value}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge
          variant={value === 'enrolled' ? 'default' : 'secondary'}
          className={value === 'enrolled' ? 'bg-emerald-600' : ''}
        >
          {value}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Courses</h1>
          <p className="text-gray-400">Manage your enrolled courses and view details</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <BookOpen className="h-4 w-4 mr-2" />
          View All Available
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Credit Hours</p>
                <p className="text-2xl font-bold text-white">13</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Average Attendance</p>
                <p className="text-2xl font-bold text-white">92%</p>
              </div>
              <Clock className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Semester GPA</p>
                <p className="text-2xl font-bold text-white">3.52</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Enrolled Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={courses}
            columns={columns}
            searchKey="title"
            emptyMessage="No courses enrolled"
          />
        </CardContent>
      </Card>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, TrendingUp, AlertTriangle, Award } from 'lucide-react';

export default function AttendancePage() {
  const [selectedCourse, setSelectedCourse] = useState('all');

  // Mock data
  const attendanceRecords = [
    {
      id: '1',
      courseCode: 'CS-401',
      courseTitle: 'Software Engineering',
      date: '2024-12-15',
      status: 'present',
      markedBy: 'Dr. Ahmed Ali',
    },
    {
      id: '2',
      courseCode: 'CS-403',
      courseTitle: 'Database Systems',
      date: '2024-12-14',
      status: 'present',
      markedBy: 'Prof. Sarah Khan',
    },
    {
      id: '3',
      courseCode: 'CS-405',
      courseTitle: 'Computer Networks',
      date: '2024-12-13',
      status: 'absent',
      markedBy: 'Dr. Hassan Shah',
    },
    {
      id: '4',
      courseCode: 'MT-401',
      courseTitle: 'Calculus III',
      date: '2024-12-12',
      status: 'late',
      markedBy: 'Dr. Fatima Malik',
    },
    {
      id: '5',
      courseCode: 'CS-401',
      courseTitle: 'Software Engineering',
      date: '2024-12-13',
      status: 'present',
      markedBy: 'Dr. Ahmed Ali',
    },
  ];

  // Calculate attendance statistics
  const courseStats = [
    { course: 'CS-401', present: 25, total: 28, percentage: 89.3 },
    { course: 'CS-403', present: 26, total: 28, percentage: 92.9 },
    { course: 'CS-405', present: 23, total: 28, percentage: 82.1 },
    { course: 'MT-401', present: 24, total: 28, percentage: 85.7 },
  ];

  const overallAttendance = courseStats.reduce((sum, course) => sum + course.percentage, 0) / courseStats.length;
  const totalPresent = courseStats.reduce((sum, course) => sum + course.present, 0);
  const totalClasses = courseStats.reduce((sum, course) => sum + course.total, 0);

  // Use Array.from for compatibility with older TS target without downlevelIteration
  const courses = Array.from(new Set(attendanceRecords.map(record => record.courseCode)));
  
  const filteredRecords = selectedCourse === 'all' 
    ? attendanceRecords 
    : attendanceRecords.filter(record => record.courseCode === selectedCourse);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-600';
      case 'late':
        return 'bg-amber-600';
      case 'absent':
        return 'bg-red-600';
      default:
        return '';
    }
  };

  const columns = [
    {
      key: 'courseCode',
      title: 'Course',
      render: (value: string, item: any) => (
        <div>
          <span className="font-mono text-blue-400">{value}</span>
          <p className="text-gray-400 text-xs">{item.courseTitle}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'date',
      title: 'Date',
      render: (value: string) => (
        <span className="text-gray-300">{new Date(value).toLocaleDateString()}</span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge
          variant={value === 'present' ? 'default' : 'destructive'}
          className={getStatusColor(value)}
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'markedBy',
      title: 'Marked By',
      render: (value: string) => (
        <span className="text-gray-400 text-sm">{value}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Record</h1>
          <p className="text-gray-400">Track your class attendance and statistics</p>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Overall Attendance</p>
                <p className="text-2xl font-bold text-white">{overallAttendance.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Classes Attended</p>
                <p className="text-2xl font-bold text-white">{totalPresent}/{totalClasses}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Classes Missed</p>
                <p className="text-2xl font-bold text-red-400">{totalClasses - totalPresent}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className="text-2xl font-bold text-emerald-400">Good</p>
              </div>
              <Award className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course-wise Attendance */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Course-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {courseStats.map((stat) => (
              <div key={stat.course} className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-mono text-blue-400 mb-2">{stat.course}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Attended:</span>
                    <span className="text-white">{stat.present}/{stat.total}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stat.percentage >= 90 ? 'bg-emerald-500' :
                        stat.percentage >= 80 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <span className={`font-bold text-lg ${
                      stat.percentage >= 90 ? 'text-emerald-400' :
                      stat.percentage >= 80 ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {stat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course} value={course} className="text-white">
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Attendance Records Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredRecords}
            columns={columns}
            searchKey="courseCode"
            emptyMessage="No attendance records found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
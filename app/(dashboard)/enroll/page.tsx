'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';

export default function EnrollPage() {
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Mock data
  const availableCourses = [
    {
      id: '5',
      code: 'CS-407',
      title: 'Machine Learning',
      creditHours: 3,
      prerequisite: 'CS-301, MT-205',
      enrolled: 25,
      capacity: 30,
      department: 'Computer Science',
      available: true
    },
    {
      id: '6',
      code: 'CS-409',
      title: 'Computer Graphics',
      creditHours: 4,
      prerequisite: 'CS-205, MT-203',
      enrolled: 20,
      capacity: 25,
      department: 'Computer Science',
      available: true
    },
    {
      id: '7',
      code: 'MT-403',
      title: 'Statistics',
      creditHours: 3,
      prerequisite: 'MT-201',
      enrolled: 30,
      capacity: 30,
      department: 'Mathematics',
      available: false
    },
    {
      id: '8',
      code: 'EE-401',
      title: 'Digital Signal Processing',
      creditHours: 3,
      prerequisite: 'EE-301',
      enrolled: 18,
      capacity: 25,
      department: 'Electrical Engineering',
      available: true
    },
  ];

  const departments = [
    'Computer Science',
    'Mathematics',
    'Electrical Engineering',
    'Physics',
  ];

  const filteredCourses = selectedDepartment === 'all' 
    ? availableCourses 
    : availableCourses.filter(course => course.department === selectedDepartment);

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
      key: 'capacity',
      title: 'Enrollment',
      render: (value: number, item: any) => (
        <div className="text-sm">
          <span className="text-gray-400">{item.enrolled}/{value}</span>
          <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
            <div
              className="bg-blue-500 h-1 rounded-full"
              style={{ width: `${(item.enrolled / value) * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'available',
      title: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'destructive'}>
          {value ? 'Available' : 'Full'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, item: any) => (
        <Button
          size="sm"
          disabled={!item.available}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
        >
          <Plus className="h-3 w-3 mr-1" />
          Enroll
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Course Enrollment</h1>
        <p className="text-gray-400">Browse and enroll in available courses</p>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept} className="text-white">
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Available Courses</p>
              <p className="text-2xl font-bold text-white">{availableCourses.filter(c => c.available).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Credit Limit</p>
              <p className="text-2xl font-bold text-white">21</p>
              <p className="text-xs text-gray-500">Currently enrolled: 13</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Registration Period</p>
              <p className="text-2xl font-bold text-emerald-400">Open</p>
              <p className="text-xs text-gray-500">Ends Jan 15, 2025</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Courses Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Available Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCourses}
            columns={columns}
            searchKey="title"
            emptyMessage="No courses available for enrollment"
          />
        </CardContent>
      </Card>
    </div>
  );
}
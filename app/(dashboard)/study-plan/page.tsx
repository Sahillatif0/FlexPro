'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, Trash2, BookOpen, Calendar } from 'lucide-react';

export default function StudyPlanPage() {
  const [selectedSemester, setSelectedSemester] = useState('7');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Mock data
  const studyPlan = {
    id: '1',
    title: 'BS Computer Science - Degree Plan',
    semesters: [
      {
        number: 7,
        year: 2025,
        season: 'Spring',
        courses: [
          { id: '1', code: 'CS-407', title: 'Machine Learning', creditHours: 3, type: 'core' },
          { id: '2', code: 'CS-409', title: 'Computer Graphics', creditHours: 4, type: 'core' },
          { id: '3', code: 'CS-411', title: 'Human Computer Interaction', creditHours: 3, type: 'elective' },
          { id: '4', code: 'MT-403', title: 'Statistics', creditHours: 3, type: 'general' },
        ],
      },
      {
        number: 8,
        year: 2025,
        season: 'Fall',
        courses: [
          { id: '5', code: 'CS-499', title: 'Final Year Project', creditHours: 6, type: 'core' },
          { id: '6', code: 'CS-413', title: 'Information Security', creditHours: 3, type: 'core' },
          { id: '7', code: 'CS-415', title: 'Data Mining', creditHours: 3, type: 'elective' },
        ],
      },
    ],
  };

  const availableCourses = [
    { id: '8', code: 'CS-417', title: 'Cloud Computing', creditHours: 3, type: 'elective' },
    { id: '9', code: 'CS-419', title: 'Blockchain Technology', creditHours: 3, type: 'elective' },
    { id: '10', code: 'CS-421', title: 'Quantum Computing', creditHours: 3, type: 'elective' },
    { id: '11', code: 'MT-405', title: 'Numerical Analysis', creditHours: 3, type: 'general' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'core':
        return 'bg-blue-600';
      case 'elective':
        return 'bg-emerald-600';
      case 'general':
        return 'bg-amber-600';
      default:
        return 'bg-gray-600';
    }
  };

  const selectedSemesterData = studyPlan.semesters.find(sem => sem.number === parseInt(selectedSemester));
  const totalCredits = selectedSemesterData?.courses.reduce((sum, course) => sum + course.creditHours, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Study Plan</h1>
          <p className="text-gray-400">Plan your academic journey and manage course selections</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create New Plan
        </Button>
      </div>

      {/* Plan Overview */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Degree Plan Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Semesters</p>
              <p className="text-2xl font-bold text-white">{studyPlan.semesters.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Planned Courses</p>
              <p className="text-2xl font-bold text-white">
                {studyPlan.semesters.reduce((sum, sem) => sum + sem.courses.length, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Credits</p>
              <p className="text-2xl font-bold text-white">
                {studyPlan.semesters.reduce((sum, sem) => 
                  sum + sem.courses.reduce((courseSum, course) => courseSum + course.creditHours, 0), 0
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Completion</p>
              <p className="text-2xl font-bold text-emerald-400">75%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Semester Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {studyPlan.semesters.map((semester) => (
              <SelectItem key={semester.number} value={semester.number.toString()} className="text-white">
                Semester {semester.number} - {semester.season} {semester.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedSemesterData && (
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {selectedSemesterData.courses.length} Courses
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {totalCredits} Credit Hours
            </span>
          </div>
        )}
      </div>

      {selectedSemesterData && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Semester Courses */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">
                  Semester {selectedSemesterData.number} - {selectedSemesterData.season} {selectedSemesterData.year}
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add Course to Semester</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {availableCourses.map((course) => (
                            <SelectItem key={course.id} value={course.id} className="text-white">
                              {course.code} - {course.title} ({course.creditHours} CR)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          console.log('Adding course:', selectedCourse);
                          setSelectedCourse('');
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={!selectedCourse}
                      >
                        Add Course
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedSemesterData.courses.map((course, index) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg group hover:bg-gray-600 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-gray-500 cursor-move" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-400">{course.code}</span>
                        <Badge className={getTypeColor(course.type)} variant="default">
                          {course.type}
                        </Badge>
                      </div>
                      <p className="text-white font-medium">{course.title}</p>
                      <p className="text-gray-400 text-sm">{course.creditHours} Credit Hours</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Semester Summary */}
          <div className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Semester Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Courses:</span>
                  <span className="text-white font-bold">{selectedSemesterData.courses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Credits:</span>
                  <span className="text-white font-bold">{totalCredits}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Course Types:</p>
                  <div className="space-y-1">
                    {['core', 'elective', 'general'].map((type) => {
                      const count = selectedSemesterData.courses.filter(c => c.type === type).length;
                      if (count === 0) return null;
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <Badge className={getTypeColor(type)} variant="default">
                            {type}
                          </Badge>
                          <span className="text-white text-sm">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-900/20 border-blue-700">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-medium text-sm">Credit Limit</p>
                    <p className="text-blue-300 text-xs">
                      Maximum 21 credit hours allowed per semester. Current: {totalCredits} CR
                    </p>
                    <div className="w-full bg-blue-900/50 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min((totalCredits / 21) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
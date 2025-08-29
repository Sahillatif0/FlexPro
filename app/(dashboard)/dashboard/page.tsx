'use client';

import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store';
import {
  BookOpen,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Users,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAppStore();

  // Mock data
  const enrolledCourses = [
    { code: 'CS-401', title: 'Software Engineering', instructor: 'Dr. Ahmed Ali', schedule: 'MWF 09:00-10:00' },
    { code: 'CS-403', title: 'Database Systems', instructor: 'Prof. Sarah Khan', schedule: 'TTh 11:00-12:30' },
    { code: 'CS-405', title: 'Computer Networks', instructor: 'Dr. Hassan Shah', schedule: 'MWF 14:00-15:00' },
    { code: 'MT-401', title: 'Calculus III', instructor: 'Dr. Fatima Malik', schedule: 'TTh 08:00-09:30' },
  ];

  const recentGrades = [
    { course: 'CS-399', title: 'Web Engineering', grade: 'A-', gpa: 3.67 },
    { course: 'CS-397', title: 'Mobile Computing', grade: 'B+', gpa: 3.33 },
    { course: 'CS-395', title: 'AI Fundamentals', grade: 'A', gpa: 4.0 },
  ];

  const upcomingDeadlines = [
    { title: 'Fee Payment', date: 'Dec 30, 2024', type: 'payment' },
    { title: 'Course Registration', date: 'Jan 15, 2025', type: 'registration' },
    { title: 'Final Exams', date: 'May 20, 2025', type: 'exam' },
  ];

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-gray-400">
          Here's what's happening with your academic journey
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current CGPA"
          value={user.cgpa.toFixed(2)}
          icon={Award}
          trend={{ value: 2.3, isPositive: true }}
        />
        <StatCard
          title="Enrolled Courses"
          value={enrolledCourses.length}
          description="This semester"
          icon={BookOpen}
        />
        <StatCard
          title="Attendance Rate"
          value="92%"
          description="Overall average"
          icon={Calendar}
          trend={{ value: 5.1, isPositive: true }}
        />
        <StatCard
          title="Credit Hours"
          value="18"
          description="Current semester"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student Profile */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Student Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-sm text-gray-400">{user.studentId}</p>
                <Badge variant="secondary" className="mt-1">
                  {user.program}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Current Semester</p>
                <p className="text-white font-medium">{user.semester}</p>
              </div>
              <div>
                <p className="text-gray-400">CGPA</p>
                <p className="text-white font-medium">{user.cgpa}</p>
              </div>
            </div>
            {user.bio && (
              <div>
                <p className="text-gray-400 text-sm">Bio</p>
                <p className="text-gray-300 text-sm mt-1">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrolled Courses */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enrolledCourses.map((course, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-mono text-sm">{course.code}</span>
                      <span className="text-white text-sm font-medium">{course.title}</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">{course.instructor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300 text-xs">{course.schedule}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Grades */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGrades.map((grade, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 font-mono text-sm">{grade.course}</span>
                      <span className="text-white text-sm">{grade.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">GPA: {grade.gpa}</span>
                    <Badge variant={grade.grade.startsWith('A') ? 'default' : 'secondary'}>
                      {grade.grade}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      deadline.type === 'payment' ? 'bg-amber-500' :
                      deadline.type === 'registration' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-white text-sm font-medium">{deadline.title}</span>
                  </div>
                  <span className="text-gray-400 text-sm">{deadline.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
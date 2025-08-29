'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFButton } from '@/components/ui/pdf-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, TrendingUp, BookOpen, Calendar } from 'lucide-react';

export default function TranscriptPage() {
  const [selectedTerm, setSelectedTerm] = useState('all');

  // Mock data
  const transcriptData = [
    {
      id: '1',
      courseCode: 'CS-399',
      courseTitle: 'Web Engineering',
      creditHours: 3,
      grade: 'A-',
      gradePoints: 3.67,
      term: 'Spring 2024',
      year: 2024,
    },
    {
      id: '2',
      courseCode: 'CS-397',
      courseTitle: 'Mobile Computing',
      creditHours: 4,
      grade: 'B+',
      gradePoints: 3.33,
      term: 'Spring 2024',
      year: 2024,
    },
    {
      id: '3',
      courseCode: 'CS-395',
      courseTitle: 'AI Fundamentals',
      creditHours: 3,
      grade: 'A',
      gradePoints: 4.0,
      term: 'Spring 2024',
      year: 2024,
    },
    {
      id: '4',
      courseCode: 'MT-301',
      courseTitle: 'Linear Algebra',
      creditHours: 3,
      grade: 'B-',
      gradePoints: 2.67,
      term: 'Fall 2023',
      year: 2023,
    },
    {
      id: '5',
      courseCode: 'CS-301',
      courseTitle: 'Data Structures',
      creditHours: 4,
      grade: 'A',
      gradePoints: 4.0,
      term: 'Fall 2023',
      year: 2023,
    },
  ];

  const terms = ['Fall 2023', 'Spring 2024', 'Fall 2024'];
  
  const filteredData = selectedTerm === 'all' 
    ? transcriptData 
    : transcriptData.filter(record => record.term === selectedTerm);

  // Calculate statistics
  const totalCreditHours = transcriptData.reduce((sum, record) => sum + record.creditHours, 0);
  const totalQualityPoints = transcriptData.reduce((sum, record) => sum + (record.creditHours * record.gradePoints), 0);
  const cgpa = totalQualityPoints / totalCreditHours;
  
  const termStats = terms.map(term => {
    const termRecords = transcriptData.filter(record => record.term === term);
    const termCredits = termRecords.reduce((sum, record) => sum + record.creditHours, 0);
    const termQualityPoints = termRecords.reduce((sum, record) => sum + (record.creditHours * record.gradePoints), 0);
    const termGpa = termCredits > 0 ? termQualityPoints / termCredits : 0;
    
    return {
      term,
      credits: termCredits,
      gpa: termGpa,
    };
  });

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
      key: 'courseTitle',
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
      key: 'grade',
      title: 'Grade',
      render: (value: string) => {
        const isHighGrade = ['A', 'A-', 'B+'].includes(value);
        return (
          <Badge
            variant={isHighGrade ? 'default' : 'secondary'}
            className={isHighGrade ? 'bg-emerald-600' : ''}
          >
            {value}
          </Badge>
        );
      },
      sortable: true,
    },
    {
      key: 'gradePoints',
      title: 'Grade Points',
      render: (value: number) => (
        <span className="font-mono text-gray-300">{value.toFixed(2)}</span>
      ),
      sortable: true,
    },
    {
      key: 'term',
      title: 'Term',
      render: (value: string) => (
        <span className="text-gray-400 text-sm">{value}</span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Academic Transcript</h1>
          <p className="text-gray-400">View your complete academic record and grades</p>
        </div>
        <PDFButton
          title="Official Transcript"
          data={{
            studentName: 'Sahil Latif',
            studentId: '23I-0763',
            program: 'BS Computer Science',
            cgpa: cgpa.toFixed(2),
            totalCreditHours: totalCreditHours,
            records: filteredData.length,
          }}
          filename="official-transcript.pdf"
        />
      </div>

      {/* Academic Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">CGPA</p>
                <p className="text-2xl font-bold text-white">{cgpa.toFixed(2)}</p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Credit Hours</p>
                <p className="text-2xl font-bold text-white">{totalCreditHours}</p>
              </div>
              <BookOpen className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Courses Completed</p>
                <p className="text-2xl font-bold text-white">{transcriptData.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Academic Terms</p>
                <p className="text-2xl font-bold text-white">{terms.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Term-wise Performance */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Term-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {termStats.map((stat) => (
              <div key={stat.term} className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">{stat.term}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Credits:</span>
                    <span className="text-white">{stat.credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">GPA:</span>
                    <span className="text-emerald-400 font-bold">{stat.gpa.toFixed(2)}</span>
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
          <CardTitle className="text-white">Filter by Term</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white">All Terms</SelectItem>
              {terms.map((term) => (
                <SelectItem key={term} value={term} className="text-white">
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Transcript Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Grade Records</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredData}
            columns={columns}
            searchKey="courseTitle"
            emptyMessage="No grade records found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
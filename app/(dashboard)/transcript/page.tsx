'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFButton } from '@/components/ui/pdf-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, TrendingUp, BookOpen, Calendar } from 'lucide-react';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';

interface TranscriptRecord {
  id: string;
  courseCode: string;
  courseTitle: string;
  creditHours: number;
  grade: string;
  gradePoints: number;
  termId: string | null;
  term: string | null;
  createdAt: string;
}

interface TranscriptSummary {
  cgpa: number | null;
  totalCreditHours: number;
  coursesCompleted: number;
  termCount: number;
}

interface TermStat {
  term: string | null;
  credits: number;
  gpa: number;
}

export default function TranscriptPage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [records, setRecords] = useState<TranscriptRecord[]>([]);
  const [summary, setSummary] = useState<TranscriptSummary | null>(null);
  const [terms, setTerms] = useState<string[]>([]);
  const [termStats, setTermStats] = useState<TermStat[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    async function loadTranscript() {
      if(!user) return;
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/transcript?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load transcript data');
        }

        const payload = (await response.json()) as {
          records: TranscriptRecord[];
          summary: TranscriptSummary;
          terms: string[];
          termStats: TermStat[];
        };

        setRecords(payload.records);
        setSummary(payload.summary);
        setTerms(payload.terms);
        setTermStats(payload.termStats);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Transcript fetch error', err);
        setError(err.message || 'Failed to load transcript data');
        toast({
          title: 'Unable to load transcript',
          description: err.message || 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadTranscript();
    return () => controller.abort();
  }, [toast, user]);

  const filteredRecords = useMemo(() => {
    if (selectedTerm === 'all') return records;
    return records.filter((record) => record.term === selectedTerm);
  }, [records, selectedTerm]);

  const columns = useMemo(
    () => [
      {
        key: 'courseCode',
        title: 'Course Code',
        render: (value: string) => <span className="font-mono text-blue-400">{value}</span>,
        sortable: true,
      },
      {
        key: 'courseTitle',
        title: 'Course Title',
        render: (value: string) => <span className="font-medium text-white">{value}</span>,
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
        render: (value: number) => <span className="font-mono text-gray-300">{value.toFixed(2)}</span>,
        sortable: true,
      },
      {
        key: 'term',
        title: 'Term',
        render: (value: string | null) => (
          <span className="text-gray-400 text-sm">{value ?? 'N/A'}</span>
        ),
        sortable: true,
      },
    ],
    []
  );

  if (!user) {
    return <p className="text-gray-300">Sign in to view transcript information.</p>;
  }

  const cgpa = summary?.cgpa ?? null;
  const totalCreditHours = summary?.totalCreditHours ?? 0;
  const coursesCompleted = summary?.coursesCompleted ?? 0;
  const termCount = summary?.termCount ?? 0;

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
            studentName: `${user.firstName} ${user.lastName}`,
            studentId: user.studentId,
            program: user.program,
            cgpa: cgpa !== null ? cgpa.toFixed(2) : 'N/A',
            totalCreditHours,
            records: filteredRecords.length,
          }}
          filename="official-transcript.pdf"
        />
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">CGPA</p>
                <p className="text-2xl font-bold text-white">
                  {cgpa !== null ? cgpa.toFixed(2) : 'N/A'}
                </p>
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
                <p className="text-2xl font-bold text-white">{coursesCompleted}</p>
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
                <p className="text-2xl font-bold text-white">{termCount}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Term-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {termStats.length ? (
              termStats.map((stat, index) => (
                <div key={`${stat.term ?? 'unknown'}-${index}`} className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">{stat.term ?? 'Unknown Term'}</h3>
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
              ))
            ) : (
              <p className="text-sm text-gray-400">No term statistics available.</p>
            )}
          </div>
        </CardContent>
      </Card>

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
              <SelectItem value="all" className="text-white">
                All Terms
              </SelectItem>
              {terms.map((term) => (
                <SelectItem key={term} value={term} className="text-white">
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Grade Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading grade records...</p>
          ) : (
            <DataTable
              data={filteredRecords}
              columns={columns}
              searchKey="courseTitle"
              emptyMessage="No grade records found"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
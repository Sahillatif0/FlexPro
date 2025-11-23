'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFButton } from '@/components/ui/pdf-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Award,
  TrendingUp,
  BookOpen,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Sigma,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { StudentCardSkeleton, StudentMetricSkeleton } from '@/components/ui/student-skeleton';

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
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    async function loadTranscript() {
      if(!user) return;
      setIsLoading(true);
      setHasLoaded(false);
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

        if (controller.signal.aborted) return;

        setRecords(payload.records);
        setSummary(payload.summary);
        setTerms(payload.terms);
        setTermStats(payload.termStats);
        setHasLoaded(true);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Transcript fetch error', err);
        setError(err.message || 'Failed to load transcript data');
        toast({
          title: 'Unable to load transcript',
          description: err.message || 'Please try again later.',
        });
        setHasLoaded(true);
      } finally {
        if (controller.signal.aborted) return;
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

  const termOrder = useMemo(() => {
    const parseTerm = (term: string) => {
      const match = term.match(/(spring|fall)\s+(\d{4})/i);
      if (!match) {
        return { season: 0, year: Number.MAX_SAFE_INTEGER };
      }

      const [, seasonName, yearString] = match;
      const season = seasonName.toLowerCase() === 'spring' ? 0 : 1;
      const year = parseInt(yearString, 10);
      return { season, year };
    };

    const uniqueTerms = Array.from(
      new Set(
        records
          .map((record) => record.term)
          .filter((term): term is string => Boolean(term))
      )
    );

    uniqueTerms.sort((a, b) => {
      const parsedA = parseTerm(a);
      const parsedB = parseTerm(b);
      if (parsedA.year !== parsedB.year) {
        return parsedA.year - parsedB.year;
      }
      return parsedA.season - parsedB.season;
    });

    return uniqueTerms;
  }, [records]);

  const perTermRecords = useMemo(() => {
    const bucket: Record<string, TranscriptRecord[]> = {};
    termOrder.forEach((term) => {
      bucket[term] = [];
    });

    records.forEach((record) => {
      if (!record.term) return;
      if (!bucket[record.term]) {
        bucket[record.term] = [];
      }
      bucket[record.term].push(record);
    });

    return bucket;
  }, [records, termOrder]);

  const sgpaByTerm = useMemo(() => {
    const map: Record<string, number> = {};
    termOrder.forEach((term) => {
      const recs = perTermRecords[term] ?? [];
      const credits = recs.reduce((sum, item) => sum + item.creditHours, 0);
      const qualityPoints = recs.reduce((sum, item) => sum + item.gradePoints * item.creditHours, 0);
      map[term] = credits ? qualityPoints / credits : 0;
    });
    return map;
  }, [perTermRecords, termOrder]);

  const cgpaByTerm = useMemo(() => {
    const map: Record<string, number> = {};
    let accumulatedCredits = 0;
    let accumulatedQualityPoints = 0;

    termOrder.forEach((term) => {
      const recs = perTermRecords[term] ?? [];
      const credits = recs.reduce((sum, item) => sum + item.creditHours, 0);
      const qualityPoints = recs.reduce((sum, item) => sum + item.gradePoints * item.creditHours, 0);
      accumulatedCredits += credits;
      accumulatedQualityPoints += qualityPoints;
      map[term] = accumulatedCredits ? accumulatedQualityPoints / accumulatedCredits : 0;
    });

    return map;
  }, [perTermRecords, termOrder]);

  const chartDataByTerm = useMemo(() => {
    return termOrder.map((term) => {
      const recs = perTermRecords[term] ?? [];
      const credits = recs.reduce((sum, item) => sum + item.creditHours, 0);
      const qualityPoints = recs.reduce((sum, item) => sum + item.gradePoints * item.creditHours, 0);
      return {
        term,
        sgpa: sgpaByTerm[term] ?? 0,
        cgpa: cgpaByTerm[term] ?? 0,
        credits,
        qualityPoints,
        courses: recs.length,
      };
    });
  }, [cgpaByTerm, perTermRecords, sgpaByTerm, termOrder]);

  const gradeBucketsOverall = useMemo(() => {
    const buckets: Record<'A' | 'B' | 'C' | 'D' | 'F', number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    records.forEach((record) => {
      const firstLetter = record.grade?.[0]?.toUpperCase() ?? 'F';
      if (firstLetter === 'A') buckets.A += 1;
      else if (firstLetter === 'B') buckets.B += 1;
      else if (firstLetter === 'C') buckets.C += 1;
      else if (firstLetter === 'D') buckets.D += 1;
      else buckets.F += 1;
    });

    return Object.entries(buckets).map(([grade, count]) => ({ grade, count }));
  }, [records]);

  const tableColumns = useMemo(
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

  const tableColumnCount = tableColumns.length;
  const hasChartData = chartDataByTerm.some(
    (entry) => entry.courses > 0 || entry.credits > 0 || entry.qualityPoints > 0
  );
  const hasGradeDistribution = gradeBucketsOverall.some((bucket) => bucket.count > 0);
  const qualityPointsGradientId = 'transcript-quality-points-gradient';

  if (!user) {
    return <p className="text-gray-300">Sign in to view transcript information.</p>;
  }

  const cgpa = summary?.cgpa ?? null;
  const totalCreditHours = summary?.totalCreditHours ?? 0;
  const coursesCompleted = summary?.coursesCompleted ?? 0;
  const termCount = summary?.termCount ?? 0;
  const showSkeletons = isLoading && !hasLoaded;

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
            terms: termOrder.map((term) => ({
              term,
              sgpa: (sgpaByTerm[term] ?? 0).toFixed(2),
              cgpaUntilTerm: (cgpaByTerm[term] ?? 0).toFixed(2),
              credits: (perTermRecords[term] ?? []).reduce((sum, item) => sum + item.creditHours, 0),
              courses: (perTermRecords[term] ?? []).map((item) => ({
                courseCode: item.courseCode,
                courseTitle: item.courseTitle,
                creditHours: item.creditHours,
                grade: item.grade,
                gradePoints: item.gradePoints.toFixed(2),
              })),
            })),
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
        {showSkeletons
          ? Array.from({ length: 4 }).map((_, index) => (
              <StudentMetricSkeleton key={index} />
            ))
          : (
              <>
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
              </>
            )}
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Term-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {showSkeletons ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <StudentCardSkeleton key={index} lines={3} withHeader={false} />
              ))}
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-[#090f1c] shadow-[0_20px_60px_rgba(3,7,18,0.7)]">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Deep Insights</p>
              <CardTitle className="text-2xl font-semibold text-white">Analytics &amp; CGPA Trends</CardTitle>
            </div>
            <button
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setAnalyticsOpen((open) => !open)}
              disabled={!hasChartData && !hasGradeDistribution}
            >
              {analyticsOpen ? 'Hide' : 'Show'} Insights
            </button>
          </div>
        </CardHeader>
        {analyticsOpen ? (
          <CardContent className="space-y-8 bg-gradient-to-b from-transparent to-white/5">
            {hasChartData ? (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Line View</p>
                        <p className="text-base font-semibold text-white">SGPA &amp; CGPA trajectory</p>
                      </div>
                      <LineChartIcon className="h-5 w-5 text-sky-300" />
                    </div>
                    <ChartContainer
                      config={{
                        sgpa: { label: 'SGPA', color: '#34d399' },
                        cgpa: { label: 'CGPA', color: '#60a5fa' },
                      }}
                    >
                      <LineChart data={chartDataByTerm} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" />
                        <XAxis dataKey="term" tick={{ fill: '#cbd5f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2a37' }} />
                        <YAxis domain={[0, 4]} tick={{ fill: '#cbd5f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2a37' }} />
                        <ChartTooltip content={<ChartTooltipContent className="bg-[#0b1528]/90" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="sgpa" stroke="var(--color-sgpa)" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="cgpa" stroke="var(--color-cgpa)" strokeWidth={3} strokeDasharray="6 6" dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Bars</p>
                        <p className="text-base font-semibold text-white">Credits earned each term</p>
                      </div>
                      <BarChart3 className="h-5 w-5 text-amber-300" />
                    </div>
                    <ChartContainer config={{ credits: { label: 'Credits', color: '#fbbf24' } }}>
                      <BarChart data={chartDataByTerm} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" />
                        <XAxis dataKey="term" tick={{ fill: '#cbd5f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2a37' }} />
                        <YAxis tick={{ fill: '#cbd5f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2a37' }} />
                        <ChartTooltip content={<ChartTooltipContent className="bg-[#0b1528]/90" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="credits" fill="var(--color-credits)" radius={[8, 8, 4, 4]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Distribution</p>
                        <p className="text-base font-semibold text-white">Overall grade share</p>
                      </div>
                      <PieChartIcon className="h-5 w-5 text-fuchsia-300" />
                    </div>
                    {hasGradeDistribution ? (
                      <ChartContainer
                        config={{
                          A: { label: 'A', color: '#34d399' },
                          B: { label: 'B', color: '#60a5fa' },
                          C: { label: 'C', color: '#fbbf24' },
                          D: { label: 'D', color: '#fb923c' },
                          F: { label: 'F', color: '#f87171' },
                        }}
                      >
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent className="bg-[#0b1528]/90" />} />
                          <Pie data={gradeBucketsOverall} dataKey="count" nameKey="grade" outerRadius={90} innerRadius={55} stroke="#090f1c">
                            {gradeBucketsOverall.map((entry) => (
                              <Cell key={entry.grade} fill={`var(--color-${entry.grade})`} />
                            ))}
                          </Pie>
                          <ChartLegend content={<ChartLegendContent />} />
                        </PieChart>
                      </ChartContainer>
                    ) : (
                      <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70">
                        No graded courses yet to build a distribution.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Momentum</p>
                        <p className="text-base font-semibold text-white">Quality points trend</p>
                      </div>
                      <Sigma className="h-5 w-5 text-emerald-300" />
                    </div>
                    <ChartContainer config={{ qualityPoints: { label: 'Quality Points', color: '#34d399' } }}>
                      <AreaChart data={chartDataByTerm} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" />
                        <XAxis dataKey="term" tick={{ fill: '#cbd5f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2a37' }} />
                        <YAxis tick={{ fill: '#cbd5f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2a37' }} />
                        <ChartTooltip content={<ChartTooltipContent className="bg-[#0b1528]/90" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <defs>
                          <linearGradient id={qualityPointsGradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="qualityPoints"
                          stroke="var(--color-qualityPoints)"
                          strokeWidth={2}
                          fill={`url(#${qualityPointsGradientId})`}
                          fillOpacity={1}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70">
                Insufficient transcript activity to generate insights yet. Complete a few courses and check back here.
              </p>
            )}
          </CardContent>
        ) : null}
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
            <SelectContent className="student-popover">
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
          <DataTable
            data={filteredRecords}
            columns={tableColumns}
            searchKey="courseTitle"
            emptyMessage="No grade records found"
            isLoading={isLoading}
            hideSearchWhileLoading
            skeletonColumns={tableColumnCount}
            showEmptyState={hasLoaded}
          />
        </CardContent>
      </Card>
    </div>
  );
}
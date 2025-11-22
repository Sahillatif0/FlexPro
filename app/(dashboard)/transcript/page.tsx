'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PDFButton } from '@/components/ui/pdf-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, TrendingUp, BookOpen, Calendar, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Sigma } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

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

  const termOrder = useMemo(() => {
    const parse = (term: string) => {
      const m = term.match(/(Spring|Fall)\s+(\d{4})/i);
      if (!m) return { year: Number.MAX_SAFE_INTEGER, season: 0 };
      const seasonName = m[1].toLowerCase();
      const year = parseInt(m[2], 10);
      const season = seasonName === 'spring' ? 0 : 1;
      return { year, season };
    };
    const unique = Array.from(new Set(records.map((r) => r.term).filter(Boolean))) as string[];
    unique.sort((a, b) => {
      const pa = parse(a);
      const pb = parse(b);
      if (pa.year !== pb.year) return pa.year - pb.year;
      return pa.season - pb.season;
    });
    return unique;
  }, [records]);

  const perTermRecords = useMemo(() => {
    const buckets: Record<string, TranscriptRecord[]> = {};
    termOrder.forEach((t) => (buckets[t] = []));
    records.forEach((r) => {
      if (!r.term) return;
      if (!buckets[r.term]) buckets[r.term] = [];
      buckets[r.term].push(r);
    });
    return buckets;
  }, [records, termOrder]);

  const sgpaByTerm = useMemo(() => {
    const map: Record<string, number> = {};
    termOrder.forEach((t) => {
      const recs = perTermRecords[t] || [];
      const credits = recs.reduce((s, r) => s + r.creditHours, 0);
      const qp = recs.reduce((s, r) => s + r.gradePoints * r.creditHours, 0);
      map[t] = credits ? qp / credits : 0;
    });
    return map;
  }, [perTermRecords, termOrder]);

  const cgpaByTerm = useMemo(() => {
    const map: Record<string, number> = {};
    let accCredits = 0;
    let accQp = 0;
    termOrder.forEach((t) => {
      const recs = perTermRecords[t] || [];
      const credits = recs.reduce((s, r) => s + r.creditHours, 0);
      const qp = recs.reduce((s, r) => s + r.gradePoints * r.creditHours, 0);
      accCredits += credits;
      accQp += qp;
      map[t] = accCredits ? accQp / accCredits : 0;
    });
    return map;
  }, [perTermRecords, termOrder]);

  const chartDataByTerm = useMemo(() => {
    return termOrder.map((t) => {
      const recs = perTermRecords[t] || [];
      const credits = recs.reduce((s, r) => s + r.creditHours, 0);
      const qp = recs.reduce((s, r) => s + r.gradePoints * r.creditHours, 0);
      const courses = recs.length;
      return {
        term: t,
        sgpa: sgpaByTerm[t] ?? 0,
        cgpa: cgpaByTerm[t] ?? 0,
        credits,
        qualityPoints: qp,
        courses,
      };
    });
  }, [termOrder, perTermRecords, sgpaByTerm, cgpaByTerm]);

  const gradeBucketsOverall = useMemo(() => {
    const bucket: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    records.forEach((r) => {
      const letter = r.grade?.[0] ?? 'F';
      const key = ['A', 'B', 'C', 'D'].includes(letter) ? letter : 'F';
      bucket[key] += 1;
    });
    return Object.entries(bucket).map(([grade, count]) => ({ grade, count }));
  }, [records]);

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
          const isElite = ['A', 'A+'].includes(value);
          const isFail = value === 'F';
          const variant = isFail ? 'destructive' : isElite ? 'outline' : 'secondary';
          const className = isFail
            ? 'bg-red-600 text-white'
            : isElite
            ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30'
            : 'bg-gray-700/60 text-gray-200 border-gray-600';
          return (
            <Badge variant={variant} className={className}>
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

  const termColumns = useMemo(() => columns.filter((c) => c.key !== 'term'), [columns]);

  const { highestTerm, lowestTerm } = useMemo(() => {
    if (!termOrder.length) return { highestTerm: null, lowestTerm: null };

    let maxTerm = termOrder[0];
    let minTerm = termOrder[0];
    let maxValue = sgpaByTerm[maxTerm] ?? 0;
    let minValue = sgpaByTerm[minTerm] ?? 0;

    termOrder.forEach((term) => {
      const sgpa = sgpaByTerm[term] ?? 0;
      if (sgpa > maxValue) {
        maxValue = sgpa;
        maxTerm = term;
      }
      if (sgpa < minValue) {
        minValue = sgpa;
        minTerm = term;
      }
    });

    return { highestTerm: maxTerm, lowestTerm: minTerm };
  }, [termOrder, sgpaByTerm]);

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
            records: records.length,
            terms: termOrder.map((t) => ({
              term: t,
              sgpa: (sgpaByTerm[t] ?? 0).toFixed(2),
              cgpaUntilTerm: (cgpaByTerm[t] ?? 0).toFixed(2),
              courses: (perTermRecords[t] || []).map((r) => ({
                courseCode: r.courseCode,
                courseTitle: r.courseTitle,
                creditHours: r.creditHours,
                grade: r.grade,
                gradePoints: r.gradePoints.toFixed(2),
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
              <TrendingUp className="h-8 w-8 text-emerald-500" />
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
              <BookOpen className="h-8 w-8 text-amber-500" />
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
          <CardTitle className="text-white">Term-wise Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading transcript...</p>
          ) : termOrder.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {termOrder.map((term) => {
                const recs = perTermRecords[term] || [];
                const sgpa = sgpaByTerm[term] ?? 0;
                const cgpaT = cgpaByTerm[term] ?? 0;
                return (
                  <div key={term} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">{term}</h3>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-gray-400 text-xs">SGPA</p>
                          <p className="text-emerald-400 font-bold">{sgpa.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 text-xs">CGPA</p>
                          <p className="text-blue-400 font-bold">{cgpaT.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <DataTable
                      data={recs}
                      columns={termColumns}
                      searchKey="courseTitle"
                      emptyMessage="No records for this term"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No term records available.</p>
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
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              onClick={() => setAnalyticsOpen((v) => !v)}
            >
              {analyticsOpen ? 'Hide' : 'Show'} Insights
            </button>
          </div>
        </CardHeader>
        {analyticsOpen ? (
          <CardContent className="space-y-8 bg-gradient-to-b from-transparent to-white/5">
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
                    <Line type="monotone" dataKey="sgpa" stroke="var(--color-sgpa)" strokeWidth={3} dot={{ r: 0 }} />
                    <Line type="monotone" dataKey="cgpa" stroke="var(--color-cgpa)" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 0 }} />
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
              </div>

              <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Momentum</p>
                    <p className="text-base font-semibold text-white">Quality points trend</p>
                  </div>
                  <Sigma className="h-5 w-5 text-emerald-300" />
                </div>
                <ChartContainer config={{ qp: { label: 'Quality Points', color: '#34d399' } }}>
                  <AreaChart data={chartDataByTerm} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" />
                    <XAxis dataKey="term" tick={{ fill: '#cbd5f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2a37' }} />
                    <YAxis tick={{ fill: '#cbd5f5', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2a37' }} />
                    <ChartTooltip content={<ChartTooltipContent className="bg-[#0b1528]/90" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area
                      type="monotone"
                      dataKey="qualityPoints"
                      stroke="var(--color-qp)"
                      strokeWidth={2}
                      fill="url(#qpGradient)"
                      fillOpacity={1}
                    />
                    <defs>
                      <linearGradient id="qpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      
    </div>
  );
}

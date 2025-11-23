'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Star, ThumbsUp, AlertTriangle } from 'lucide-react';

interface FeedbackItem {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  termId: string | null;
  termName: string | null;
  rating: number;
  comment: string;
  submittedAt: string;
}

interface CourseStat {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  totalResponses: number;
  averageRating: number;
  latestFeedbackAt: string;
}

interface RatingBucket {
  rating: number;
  count: number;
}

interface FacultyFeedbackResponse {
  feedback: FeedbackItem[];
  summary: {
    total: number;
    averageRating: number | null;
    positiveCount: number;
    needsAttention: number;
  };
  courseStats: CourseStat[];
  ratingDistribution: RatingBucket[];
  filters: {
    courses: Array<{ courseId: string; courseCode: string; courseTitle: string }>;
    terms: Array<{ id: string; name: string }>;
    ratings: number[];
  };
}

type CourseFilter = 'all' | string;

type TermFilter = 'all' | string;

type RatingFilter = 'all' | string;

const ratingLabel: Record<number, string> = {
  1: 'Very Dissatisfied',
  2: 'Needs Improvement',
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Excellent',
};

export default function FacultyAnonymousFeedbackPage() {
  const { toast } = useToast();
  const [data, setData] = useState<FacultyFeedbackResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('all');
  const [termFilter, setTermFilter] = useState<TermFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/faculty/feedback');
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Failed to load feedback');
      }
      const payload = (await response.json()) as FacultyFeedbackResponse;
      setData(payload);
    } catch (err: any) {
      console.error('Faculty feedback fetch failed', err);
      const message = err?.message ?? 'Failed to load feedback';
      setError(message);
      toast({
        title: 'Unable to load feedback',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const filteredFeedback = useMemo(() => {
    if (!data) {
      return [] as FeedbackItem[];
    }

    return data.feedback.filter((item) => {
      if (courseFilter !== 'all' && item.courseId !== courseFilter) {
        return false;
      }

      if (termFilter !== 'all' && item.termId !== termFilter) {
        return false;
      }

      if (ratingFilter !== 'all') {
        const threshold = Number(ratingFilter);
        if (Number.isFinite(threshold) && item.rating < threshold) {
          return false;
        }
      }

      return true;
    });
  }, [data, courseFilter, termFilter, ratingFilter]);

  const maxDistribution = useMemo(() => {
    if (!data) {
      return 0;
    }
    return data.ratingDistribution.reduce((max, bucket) => Math.max(max, bucket.count), 0);
  }, [data]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-emerald-400" />
          Anonymous Feedback
        </h1>
        <p className="text-sm text-gray-400">
          Review anonymous feedback submitted for your courses to spot trends and track sentiment.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load anonymous feedback</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-gray-900 border-gray-800">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-24 bg-gray-800" />
                <Skeleton className="h-8 w-20 bg-gray-800" />
                <Skeleton className="h-3 w-20 bg-gray-800" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Responses</p>
                    <p className="text-3xl font-bold text-white">{summary.total}</p>
                  </div>
                  <MessageCircle className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Average Rating</p>
                    <p className="text-3xl font-bold text-white">
                      {summary.averageRating !== null ? summary.averageRating.toFixed(2) : '—'}
                    </p>
                  </div>
                  <Star className="h-10 w-10 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Positive (≥4)</p>
                    <p className="text-3xl font-bold text-white">{summary.positiveCount}</p>
                  </div>
                  <ThumbsUp className="h-10 w-10 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Needs Attention (≤2)</p>
                    <p className="text-3xl font-bold text-white">{summary.needsAttention}</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Sentiment Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2 min-w-[200px]">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Course</span>
                <Select value={courseFilter} onValueChange={(value: CourseFilter) => setCourseFilter(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all">All Courses</SelectItem>
                    {data?.filters.courses.map((course) => (
                      <SelectItem key={course.courseId} value={course.courseId}>
                        {course.courseCode} · {course.courseTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 min-w-[180px]">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Term</span>
                <Select value={termFilter} onValueChange={(value: TermFilter) => setTermFilter(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all">All Terms</SelectItem>
                    {data?.filters.terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 min-w-[180px]">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Minimum Rating</span>
                <Select value={ratingFilter} onValueChange={(value: RatingFilter) => setRatingFilter(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all">All Ratings</SelectItem>
                    {data?.filters.ratings.map((rating) => (
                      <SelectItem key={rating} value={String(rating)}>
                        ≥ {rating} Stars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Showing {filteredFeedback.length} of {data?.summary.total ?? 0} responses
            </div>
          </div>

          <Separator className="bg-gray-800" />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm text-gray-300 font-medium">Rating Distribution</p>
              {data?.ratingDistribution.map((bucket) => {
                const percentage = maxDistribution
                  ? Math.round((bucket.count / maxDistribution) * 100)
                  : 0;
                return (
                  <div key={bucket.rating} className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {bucket.rating} Star{bucket.rating > 1 ? 's' : ''}
                        <span className="ml-2 text-gray-500">
                          {ratingLabel[bucket.rating]}
                        </span>
                      </span>
                      <span>{bucket.count}</span>
                    </div>
                    <Progress value={percentage} className="h-2 bg-gray-800" />
                  </div>
                );
              })}
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-300 font-medium">Course Highlights</p>
              {data?.courseStats.length ? (
                <div className="space-y-3">
                  {data.courseStats.map((course) => (
                    <div key={course.courseId} className="rounded-lg bg-gray-800/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            {course.courseCode} · {course.courseTitle}
                          </p>
                          <p className="text-xs text-gray-400">
                            {course.totalResponses} response{course.totalResponses === 1 ? '' : 's'}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-emerald-500 text-emerald-400">
                          {course.averageRating.toFixed(2)} ★
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Latest feedback {new Date(course.latestFeedbackAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No feedback recorded yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Anonymous Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-48 bg-gray-800" />
                  <Skeleton className="h-3 w-64 bg-gray-800" />
                  <Skeleton className="h-3 w-56 bg-gray-800" />
                </div>
              ))}
            </div>
          ) : filteredFeedback.length ? (
            <div className="space-y-4">
              {filteredFeedback.map((item) => (
                <div key={item.id} className="rounded-lg bg-gray-800/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">
                        {item.courseCode} · {item.courseTitle}
                      </p>
                      {item.termName ? (
                        <p className="text-xs text-gray-400">{item.termName}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="bg-emerald-600/20 text-emerald-400">
                      {item.rating} ★
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-line">
                    {item.comment || 'No comment provided.'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Submitted {new Date(item.submittedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No feedback matches the current filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { Star, MessageSquare, Send } from 'lucide-react';

interface PendingFeedbackItem {
  courseId: string;
  enrollmentId: string;
  code: string;
  title: string;
  instructor: string;
  termId: string;
  term: string | null;
}

interface SubmittedFeedbackItem {
  id: string;
  courseId: string;
  code: string;
  title: string;
  termId: string;
  term: string | null;
  rating: number;
  comment: string;
  submittedAt: string;
}

interface FeedbackSummary {
  pendingCount: number;
  submittedCount: number;
  averageRating: number | null;
}

function ReadonlyStarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${
            star <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [activeCourse, setActiveCourse] = useState<PendingFeedbackItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedbackItem[]>([]);
  const [submittedFeedback, setSubmittedFeedback] = useState<SubmittedFeedbackItem[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/feedback?${params.toString()}`, {
          signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load feedback data');
        }

        const payload = (await response.json()) as {
          pendingFeedback: PendingFeedbackItem[];
          submittedFeedback: SubmittedFeedbackItem[];
          summary: FeedbackSummary;
        };

        if (signal?.aborted) {
          return;
        }
        setPendingFeedback(payload.pendingFeedback);
        setSubmittedFeedback(payload.submittedFeedback);
        setSummary(payload.summary);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Feedback fetch error', err);
        setError(err.message || 'Failed to load feedback data');
        toast({
          title: 'Unable to load feedback',
          description: err.message || 'Please try again later.',
        });
      } finally {
        if (signal?.aborted) {
          return;
        }
        setIsLoading(false);
      }
    },
    [toast, user]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchFeedback(controller.signal);
    return () => controller.abort();
  }, [fetchFeedback]);

  useEffect(() => {
    if (!dialogOpen) {
      setRating(0);
      setHoverRating(0);
      setComment('');
      setActiveCourse(null);
    }
  }, [dialogOpen]);

  const StarRating = ({ value, readonly = false }: { value: number; readonly?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && setRating(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          disabled={readonly}
          className="focus:outline-none"
        >
          <Star
            className={`h-5 w-5 ${
              star <= (readonly ? value : hoverRating || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );

  const pendingColumns = useMemo(
    () => [
      {
        key: 'code',
        title: 'Course Code',
        render: (value: string) => (
          <span className="font-mono text-blue-400">{value}</span>
        ),
      },
      {
        key: 'title',
        title: 'Course Title',
        render: (value: string) => (
          <span className="font-medium text-white">{value}</span>
        ),
      },
      {
        key: 'instructor',
        title: 'Instructor',
        render: (value: string) => (
          <span className="text-gray-300 text-sm">{value}</span>
        ),
      },
      {
        key: 'term',
        title: 'Term',
        render: (value: string | null) => (
          <span className="text-gray-400 text-sm">{value ?? 'Current term'}</span>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_: unknown, item: PendingFeedbackItem) => (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setActiveCourse(item);
              setDialogOpen(true);
            }}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Submit
          </Button>
        ),
      },
    ],
    []
  );

  const submittedColumns = useMemo(
    () => [
      {
        key: 'code',
        title: 'Course Code',
        render: (value: string) => (
          <span className="font-mono text-blue-400">{value}</span>
        ),
      },
      {
        key: 'title',
        title: 'Course Title',
        render: (value: string) => (
          <span className="font-medium text-white">{value}</span>
        ),
      },
      {
        key: 'term',
        title: 'Term',
        render: (value: string | null) => (
          <span className="text-gray-400 text-sm">{value ?? '—'}</span>
        ),
      },
      {
        key: 'rating',
        title: 'Rating',
        render: (value: number) => <ReadonlyStarRating value={value} />,
      },
      {
        key: 'comment',
        title: 'Comment',
        render: (value: string) => (
          <span className="text-gray-300 text-sm max-w-xs truncate block">{value}</span>
        ),
      },
    ],
    []
  );

  const handleSubmitFeedback = async () => {
    if (!user || !activeCourse) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          courseId: activeCourse.courseId,
          termId: activeCourse.termId,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || 'Failed to submit feedback');
      }

      toast({
        title: 'Feedback submitted',
        description: `Thanks for sharing feedback on ${activeCourse.title}.`,
      });
      setDialogOpen(false);
      await fetchFeedback();
    } catch (err: any) {
      console.error('Feedback submission error', err);
      toast({
        title: 'Unable to submit feedback',
        description: err.message || 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <div className="text-gray-300">Sign in to submit course feedback.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Course Feedback</h1>
        <p className="text-gray-400">Provide feedback for your enrolled courses</p>
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400 text-sm">Pending Feedback</p>
            <p className="text-2xl font-bold text-amber-400">
              {summary?.pendingCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400 text-sm">Submitted</p>
            <p className="text-2xl font-bold text-emerald-400">
              {summary?.submittedCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400 text-sm">Average Rating</p>
            <p className="text-2xl font-bold text-white">
              {summary?.averageRating !== null
                ? summary?.averageRating.toFixed(1)
                : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Pending Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading feedback...</p>
          ) : (
            <DataTable
              data={pendingFeedback}
              columns={pendingColumns}
              searchKey="title"
              emptyMessage="No pending feedback"
            />
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Submitted Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading feedback...</p>
          ) : (
            <DataTable
              data={submittedFeedback}
              columns={submittedColumns}
              searchKey="title"
              emptyMessage="No feedback submitted yet"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Course Feedback</DialogTitle>
          </DialogHeader>
          {activeCourse ? (
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">
                  Course: {activeCourse.code} — {activeCourse.title}
                </p>
                <p className="text-gray-400 text-sm">
                  Instructor: {activeCourse.instructor}
                </p>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Rating</label>
                <div className="mt-2">
                  <StarRating value={rating} />
                </div>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Comments</label>
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Share your feedback about the course..."
                  className="mt-2 bg-gray-700 border-gray-600 text-white"
                  rows={4}
                />
              </div>
              <Button
                onClick={handleSubmitFeedback}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={rating === 0 || isSubmitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
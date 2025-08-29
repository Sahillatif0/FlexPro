'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, MessageSquare, Send } from 'lucide-react';

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  // Mock data
  const enrolledCourses = [
    {
      id: '1',
      code: 'CS-401',
      title: 'Software Engineering',
      instructor: 'Dr. Ahmed Ali',
      term: 'Fall 2024',
      feedbackSubmitted: false,
    },
    {
      id: '2',
      code: 'CS-403',
      title: 'Database Systems',
      instructor: 'Prof. Sarah Khan',
      term: 'Fall 2024',
      feedbackSubmitted: true,
      rating: 4,
      comment: 'Excellent course with practical examples.',
    },
    {
      id: '3',
      code: 'CS-405',
      title: 'Computer Networks',
      instructor: 'Dr. Hassan Shah',
      term: 'Fall 2024',
      feedbackSubmitted: false,
    },
  ];

  const submittedFeedback = enrolledCourses.filter(course => course.feedbackSubmitted);
  const pendingFeedback = enrolledCourses.filter(course => !course.feedbackSubmitted);

  const handleSubmitFeedback = () => {
    // Mock submission
    console.log('Feedback submitted:', { selectedCourse, rating, comment });
    setRating(0);
    setComment('');
    setSelectedCourse(null);
  };

  const StarRating = ({ value, onChange, readonly = false }: any) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
            className="focus:outline-none"
          >
            <Star
              className={`h-5 w-5 ${
                star <= (readonly ? value : (hoverRating || rating))
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const pendingColumns = [
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
    },
    {
      key: 'term',
      title: 'Term',
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, item: any) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => setSelectedCourse(item)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Submit
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Course Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">Course: {item?.code} - {item?.title}</p>
                <p className="text-gray-400 text-sm">Instructor: {item?.instructor}</p>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Rating</label>
                <div className="mt-2">
                  <StarRating value={rating} onChange={setRating} />
                </div>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium">Comments</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your feedback about the course..."
                  className="mt-2 bg-gray-700 border-gray-600 text-white"
                  rows={4}
                />
              </div>
              <Button
                onClick={handleSubmitFeedback}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={rating === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  const submittedColumns = [
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
    },
    {
      key: 'rating',
      title: 'Rating',
      render: (value: number) => <StarRating value={value} readonly />,
    },
    {
      key: 'comment',
      title: 'Comment',
      render: (value: string) => (
        <span className="text-gray-300 text-sm max-w-xs truncate block">
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Course Feedback</h1>
        <p className="text-gray-400">Provide feedback for your enrolled courses</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Pending Feedback</p>
              <p className="text-2xl font-bold text-amber-400">{pendingFeedback.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Submitted</p>
              <p className="text-2xl font-bold text-emerald-400">{submittedFeedback.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Average Rating</p>
              <p className="text-2xl font-bold text-white">4.0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Feedback */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Pending Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={pendingFeedback}
            columns={pendingColumns}
            searchKey="title"
            emptyMessage="No pending feedback"
          />
        </CardContent>
      </Card>

      {/* Submitted Feedback */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Submitted Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={submittedFeedback}
            columns={submittedColumns}
            searchKey="title"
            emptyMessage="No feedback submitted yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
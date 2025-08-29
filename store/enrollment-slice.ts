import { StateCreator } from 'zustand';

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  creditHours: number;
  prerequisite?: string;
  department: string;
  semester: number;
  instructor: string;
  schedule: string;
  room?: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  termId: string;
  status: string;
  enrolledAt: string;
  course: Course;
}

export interface EnrollmentSlice {
  enrollments: Enrollment[];
  availableCourses: Course[];
  setEnrollments: (enrollments: Enrollment[]) => void;
  setAvailableCourses: (courses: Course[]) => void;
  addEnrollment: (enrollment: Enrollment) => void;
  removeEnrollment: (enrollmentId: string) => void;
}

export const createEnrollmentSlice: StateCreator<EnrollmentSlice> = (set, get) => ({
  enrollments: [],
  availableCourses: [],
  setEnrollments: (enrollments) => set({ enrollments }),
  setAvailableCourses: (availableCourses) => set({ availableCourses }),
  addEnrollment: (enrollment) => {
    const currentEnrollments = get().enrollments;
    set({ enrollments: [...currentEnrollments, enrollment] });
  },
  removeEnrollment: (enrollmentId) => {
    const currentEnrollments = get().enrollments;
    set({ enrollments: currentEnrollments.filter(e => e.id !== enrollmentId) });
  },
});
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const fall2023Term = await prisma.term.upsert({
    where: { name: 'Fall 2023' },
    update: {},
    create: {
      name: 'Fall 2023',
      year: 2023,
      season: 'Fall',
      startDate: new Date('2023-08-15'),
      endDate: new Date('2023-12-20'),
      isActive: false,
    },
  });

  const springTerm = await prisma.term.upsert({
    where: { name: 'Spring 2024' },
    update: {},
    create: {
      name: 'Spring 2024',
      year: 2024,
      season: 'Spring',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-05-20'),
      isActive: false,
    },
  });

  const fallTerm = await prisma.term.upsert({
    where: { name: 'Fall 2024' },
    update: { isActive: true },
    create: {
      name: 'Fall 2024',
      year: 2024,
      season: 'Fall',
      startDate: new Date('2024-08-15'),
      endDate: new Date('2024-12-20'),
      isActive: true,
    },
  });

  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { studentId: '23I-0763' },
    update: {
      email: 'i230763@nu.edu.pk',
      firstName: 'Sahil',
      lastName: 'Latif',
      role: 'student',
      program: 'BS Computer Science',
      semester: 6,
      section: 'BCS-23A',
      cgpa: 3.45,
      bio: 'Passionate computer science student with interests in web development and AI.',
      phone: '+92-300-1234567',
      address: 'Karachi, Pakistan',
      password: hashedPassword,
    },
    create: {
      email: 'i230763@nu.edu.pk',
      password: hashedPassword,
      firstName: 'Sahil',
      lastName: 'Latif',
      studentId: '23I-0763',
      role: 'student',
      program: 'BS Computer Science',
      semester: 6,
      section: 'BCS-23A',
      cgpa: 3.45,
      bio: 'Passionate computer science student with interests in web development and AI.',
      phone: '+92-300-1234567',
      address: 'Karachi, Pakistan',
    } as any,
  });

  const facultyPassword = await bcrypt.hash('faculty123', 10);
  const faculty = await prisma.user.upsert({
    where: { studentId: 'FAC-1001' },
    update: {
      email: 'ayesha.khan@flexpro.edu',
      firstName: 'Ayesha',
      lastName: 'Khan',
      role: 'faculty',
      employeeId: 'EMP-1001',
      program: 'Faculty of Computing',
      semester: 0,
      cgpa: 0,
      bio: 'Senior lecturer responsible for core CS courses and student mentorship.',
      phone: '+92-300-7654321',
      address: 'Karachi, Pakistan',
      password: facultyPassword,
    } as any,
    create: {
      email: 'ayesha.khan@flexpro.edu',
      password: facultyPassword,
      firstName: 'Ayesha',
      lastName: 'Khan',
      studentId: 'FAC-1001',
      employeeId: 'EMP-1001',
      role: 'faculty',
      program: 'Faculty of Computing',
      semester: 0,
      cgpa: 0,
      bio: 'Senior lecturer responsible for core CS courses and student mentorship.',
      phone: '+92-300-7654321',
      address: 'Karachi, Pakistan',
    } as any,
  });

  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { studentId: 'ADM-0001' },
    update: {
      email: 'admin@flexpro.edu',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      employeeId: 'ADM-0001',
      program: 'Administration',
      semester: 0,
      cgpa: 0,
      bio: 'Platform administrator overseeing campus-wide operations.',
      phone: '+92-300-0000000',
      address: 'Karachi, Pakistan',
      password: adminPassword,
    } as any,
    create: {
      email: 'admin@flexpro.edu',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      studentId: 'ADM-0001',
      employeeId: 'ADM-0001',
      role: 'admin',
      program: 'Administration',
      semester: 0,
      cgpa: 0,
      bio: 'Platform administrator overseeing campus-wide operations.',
      phone: '+92-300-0000000',
      address: 'Karachi, Pakistan',
    } as any,
  });

  const courseInputs = [
    {
      code: 'CS-401',
      title: 'Software Engineering',
      description: 'Software development lifecycle, methodologies, and project management',
      creditHours: 3,
      prerequisite: 'CS-301',
      department: 'Computer Science',
      semester: 6,
      maxCapacity: 45,
    },
    {
      code: 'CS-403',
      title: 'Database Systems',
      description: 'Database design, SQL, NoSQL, and database administration',
      creditHours: 4,
      prerequisite: 'CS-205',
      department: 'Computer Science',
      semester: 6,
      maxCapacity: 40,
    },
    {
      code: 'CS-405',
      title: 'Computer Networks',
      description: 'Network protocols, architecture, and security',
      creditHours: 3,
      prerequisite: 'CS-203',
      department: 'Computer Science',
      semester: 6,
      maxCapacity: 40,
    },
    {
      code: 'CS-407',
      title: 'Machine Learning',
      description: 'Supervised and unsupervised learning, model evaluation, and deployment',
      creditHours: 3,
      prerequisite: 'CS-303, MT-205',
      department: 'Computer Science',
      semester: 7,
      maxCapacity: 35,
    },
    {
      code: 'CS-409',
      title: 'Computer Graphics',
      description: 'Graphics pipeline, rendering, and interactive visualization',
      creditHours: 4,
      prerequisite: 'CS-205, MT-203',
      department: 'Computer Science',
      semester: 7,
      maxCapacity: 30,
    },
    {
      code: 'MT-403',
      title: 'Statistics',
      description: 'Probability distributions, estimation, hypothesis testing, and regression',
      creditHours: 3,
      prerequisite: 'MT-201',
      department: 'Mathematics',
      semester: 4,
      maxCapacity: 50,
    },
    {
      code: 'EE-401',
      title: 'Digital Signal Processing',
      description: 'Fourier analysis, filtering, and digital signal applications',
      creditHours: 3,
      prerequisite: 'EE-301',
      department: 'Electrical Engineering',
      semester: 7,
      maxCapacity: 40,
    },
    {
      code: 'CS-399',
      title: 'Web Engineering',
      description: 'Modern web development practices and frameworks',
      creditHours: 3,
      prerequisite: 'CS-301',
      department: 'Computer Science',
      semester: 5,
      maxCapacity: 45,
    },
    {
      code: 'CS-397',
      title: 'Mobile Computing',
      description: 'Mobile application development and ubiquitous computing',
      creditHours: 4,
      prerequisite: 'CS-205',
      department: 'Computer Science',
      semester: 5,
      maxCapacity: 40,
    },
    {
      code: 'CS-395',
      title: 'AI Fundamentals',
      description: 'Knowledge representation, search, and intelligent agents',
      creditHours: 3,
      prerequisite: 'CS-205',
      department: 'Computer Science',
      semester: 5,
      maxCapacity: 40,
    },
    {
      code: 'MT-301',
      title: 'Linear Algebra',
      description: 'Matrices, vector spaces, eigenvalues, and eigenvectors',
      creditHours: 3,
      prerequisite: 'MT-104',
      department: 'Mathematics',
      semester: 3,
      maxCapacity: 60,
    },
    {
      code: 'CS-301',
      title: 'Data Structures',
      description: 'Fundamental data structures and algorithms',
      creditHours: 4,
      prerequisite: 'CS-201',
      department: 'Computer Science',
      semester: 3,
      maxCapacity: 60,
    },
    {
      code: 'CS-411',
      title: 'Human Computer Interaction',
      description: 'User experience design, prototyping, and usability evaluation',
      creditHours: 3,
      prerequisite: 'CS-301',
      department: 'Computer Science',
      semester: 7,
      maxCapacity: 35,
    },
    {
      code: 'CS-413',
      title: 'Information Security',
      description: 'Security principles, cryptography, and secure systems',
      creditHours: 3,
      prerequisite: 'CS-305',
      department: 'Computer Science',
      semester: 8,
      maxCapacity: 35,
    },
    {
      code: 'CS-415',
      title: 'Data Mining',
      description: 'Data preprocessing, pattern discovery, and predictive analytics',
      creditHours: 3,
      prerequisite: 'CS-303',
      department: 'Computer Science',
      semester: 8,
      maxCapacity: 35,
    },
    {
      code: 'CS-417',
      title: 'Cloud Computing',
      description: 'Distributed systems, virtualization, and cloud platforms',
      creditHours: 3,
      prerequisite: 'CS-305',
      department: 'Computer Science',
      semester: 7,
      maxCapacity: 30,
    },
    {
      code: 'CS-419',
      title: 'Blockchain Technology',
      description: 'Consensus mechanisms, smart contracts, and decentralized apps',
      creditHours: 3,
      prerequisite: 'CS-305',
      department: 'Computer Science',
      semester: 8,
      maxCapacity: 30,
    },
    {
      code: 'CS-421',
      title: 'Quantum Computing',
      description: 'Qubits, quantum algorithms, and computational models',
      creditHours: 3,
      prerequisite: 'CS-303, MT-203',
      department: 'Computer Science',
      semester: 8,
      maxCapacity: 20,
    },
    {
      code: 'MT-405',
      title: 'Numerical Analysis',
      description: 'Numerical methods for solving algebraic and differential equations',
      creditHours: 3,
      prerequisite: 'MT-203',
      department: 'Mathematics',
      semester: 7,
      maxCapacity: 45,
    },
    {
      code: 'CS-499',
      title: 'Final Year Project',
      description: 'Capstone project spanning two semesters',
      creditHours: 6,
      prerequisite: 'Completion of 120 credit hours',
      department: 'Computer Science',
      semester: 8,
      maxCapacity: 60,
    },
  ];

  const courseRecords = await Promise.all(
    courseInputs.map((course) =>
      prisma.course.upsert({
        where: { code: course.code },
        update: {
          title: course.title,
          description: course.description,
          creditHours: course.creditHours,
          prerequisite: course.prerequisite,
          department: course.department,
          semester: course.semester,
          maxCapacity: course.maxCapacity,
        },
        create: course,
      })
    )
  );

  const courseByCode = courseRecords.reduce<Record<string, typeof courseRecords[number]>>(
    (acc, course) => {
      acc[course.code] = course;
      return acc;
    },
    {}
  );

  const taughtCourseCodes = ['CS-401', 'CS-403', 'CS-405', 'CS-407', 'CS-409'];
  await prisma.course.updateMany({
    where: { code: { in: taughtCourseCodes } },
    data: { instructorId: faculty.id } as any,
  });

  const activeEnrollmentCodes = ['CS-401', 'CS-403', 'CS-405'];
  for (const code of activeEnrollmentCodes) {
    const course = courseByCode[code];
    if (!course) continue;
    await prisma.enrollment.upsert({
      where: {
        userId_courseId_termId: {
          userId: user.id,
          courseId: course.id,
          termId: fallTerm.id,
        },
      },
      update: { status: 'enrolled' },
      create: {
        userId: user.id,
        courseId: course.id,
        termId: fallTerm.id,
        status: 'enrolled',
      },
    });
  }

  const attendanceData = [
    { courseCode: 'CS-401', date: '2024-09-02', status: 'present' },
    { courseCode: 'CS-401', date: '2024-09-09', status: 'present' },
    { courseCode: 'CS-401', date: '2024-09-16', status: 'absent' },
    { courseCode: 'CS-403', date: '2024-09-03', status: 'present' },
    { courseCode: 'CS-403', date: '2024-09-10', status: 'late' },
    { courseCode: 'CS-403', date: '2024-09-17', status: 'present' },
    { courseCode: 'CS-405', date: '2024-09-04', status: 'present' },
    { courseCode: 'CS-405', date: '2024-09-11', status: 'present' },
    { courseCode: 'CS-405', date: '2024-09-18', status: 'present' },
  ];

  for (const record of attendanceData) {
    const course = courseByCode[record.courseCode];
    if (!course) continue;
    await prisma.attendance.upsert({
      where: {
        userId_courseId_termId_date: {
          userId: user.id,
          courseId: course.id,
          termId: fallTerm.id,
          date: new Date(record.date),
        },
      },
      update: { status: record.status },
      create: {
        userId: user.id,
        courseId: course.id,
        termId: fallTerm.id,
        date: new Date(record.date),
        status: record.status,
      },
    });
  }

  const transcriptData = [
    { courseCode: 'CS-399', termId: springTerm.id, grade: 'A-', gradePoints: 3.67 },
    { courseCode: 'CS-397', termId: springTerm.id, grade: 'B+', gradePoints: 3.33 },
    { courseCode: 'CS-395', termId: springTerm.id, grade: 'A', gradePoints: 4.0 },
    { courseCode: 'MT-301', termId: fall2023Term.id, grade: 'B-', gradePoints: 2.67 },
    { courseCode: 'CS-301', termId: fall2023Term.id, grade: 'A', gradePoints: 4.0 },
  ];

  for (const entry of transcriptData) {
    const course = courseByCode[entry.courseCode];
    if (!course) continue;
    await prisma.transcript.upsert({
      where: {
        userId_courseId_termId_status: {
          userId: user.id,
          courseId: course.id,
          termId: entry.termId,
          status: 'final',
        },
      },
      update: {
        grade: entry.grade,
        gradePoints: entry.gradePoints,
      },
      create: {
        userId: user.id,
        courseId: course.id,
        termId: entry.termId,
        grade: entry.grade,
        gradePoints: entry.gradePoints,
        status: 'final',
      },
    });
  }

  await (prisma as any).studentNote.upsert({
    where: {
      facultyId_studentId_courseId_termId_title: {
        facultyId: faculty.id,
        studentId: user.id,
        courseId: courseByCode['CS-401'].id,
        termId: fallTerm.id,
        title: 'Class Participation',
      },
    },
    update: {
      content:
        'Student shows consistent participation and often volunteers for problem-solving sessions.',
    },
    create: {
      facultyId: faculty.id,
      studentId: user.id,
      courseId: courseByCode['CS-401'].id,
      termId: fallTerm.id,
      title: 'Class Participation',
      content:
        'Student shows consistent participation and often volunteers for problem-solving sessions.',
    },
  });

  await (prisma as any).studentNote.upsert({
    where: {
      facultyId_studentId_courseId_termId_title: {
        facultyId: faculty.id,
        studentId: user.id,
        courseId: courseByCode['CS-403'].id,
        termId: fallTerm.id,
        title: 'Project Guidance',
      },
    },
    update: {
      content:
        'Guided student on database normalization project; student needs to focus on documentation clarity.',
    },
    create: {
      facultyId: faculty.id,
      studentId: user.id,
      courseId: courseByCode['CS-403'].id,
      termId: fallTerm.id,
      title: 'Project Guidance',
      content:
        'Guided student on database normalization project; student needs to focus on documentation clarity.',
    },
  });

  await prisma.feedback.upsert({
    where: {
      userId_courseId_termId: {
        userId: user.id,
        courseId: courseByCode['CS-403']?.id ?? '',
        termId: fallTerm.id,
      },
    },
    update: {
      rating: 4,
      comment: 'Excellent course with practical database design projects.',
      isAnonymous: false,
    },
    create: {
      userId: user.id,
      courseId: courseByCode['CS-403']!.id,
      termId: fallTerm.id,
      rating: 4,
      comment: 'Excellent course with practical database design projects.',
      isAnonymous: false,
    },
  });

  await prisma.gradeRequest.upsert({
    where: { id: 'grade-req-1' },
    update: {
      status: 'pending',
      adminNotes: null,
      requestedGrade: 'A-',
    },
    create: {
      id: 'grade-req-1',
      userId: user.id,
      termId: springTerm.id,
      courseCode: 'CS-399',
      currentGrade: 'B+',
      requestedGrade: 'A-',
      reason: 'Project grading discrepancy identified during review.',
      status: 'pending',
    },
  });

  await prisma.gradeRequest.upsert({
    where: { id: 'grade-req-2' },
    update: {},
    create: {
      id: 'grade-req-2',
      userId: user.id,
      termId: fall2023Term.id,
      courseCode: 'MT-301',
      currentGrade: 'C+',
      requestedGrade: 'B-',
      reason: 'Midterm re-evaluation completed, awaiting confirmation.',
      status: 'approved',
      adminNotes: 'Re-evaluation completed and adjustments applied to final grade.',
      reviewedAt: new Date('2024-01-10'),
    },
  });

  const studyPlan = await prisma.studyPlan.upsert({
    where: { id: 'plan-default' },
    update: {},
    create: {
      id: 'plan-default',
      userId: user.id,
      title: 'BS Computer Science - Degree Plan',
      isDefault: true,
    },
  });

  const studyPlanItems = [
    { courseCode: 'CS-401', semester: 7, year: 2024, order: 1 },
    { courseCode: 'CS-403', semester: 7, year: 2024, order: 2 },
    { courseCode: 'CS-407', semester: 7, year: 2024, order: 3 },
    { courseCode: 'CS-409', semester: 7, year: 2024, order: 4 },
    { courseCode: 'MT-403', semester: 7, year: 2024, order: 5 },
    { courseCode: 'CS-499', semester: 8, year: 2025, order: 1 },
    { courseCode: 'CS-413', semester: 8, year: 2025, order: 2 },
    { courseCode: 'CS-415', semester: 8, year: 2025, order: 3 },
    { courseCode: 'CS-417', semester: 8, year: 2025, order: 4 },
  ];

  for (const item of studyPlanItems) {
    const course = courseByCode[item.courseCode];
    if (!course) continue;
    await prisma.studyPlanItem.upsert({
      where: {
        studyPlanId_courseId: {
          studyPlanId: studyPlan.id,
          courseId: course.id,
        },
      },
      update: {
        semester: item.semester,
        year: item.year,
        order: item.order,
      },
      create: {
        studyPlanId: studyPlan.id,
        courseId: course.id,
        semester: item.semester,
        year: item.year,
        order: item.order,
      },
    });
  }

  const feeInvoices = [
    {
      id: 'fee-1',
      amount: 75000,
      description: 'Tuition Fee - Fall 2024',
      dueDate: new Date('2024-12-30'),
      status: 'pending' as const,
    },
    {
      id: 'fee-2',
      amount: 5000,
      description: 'Laboratory Fee - Fall 2024',
      dueDate: new Date('2024-09-15'),
      status: 'paid' as const,
    },
    {
      id: 'fee-3',
      amount: 2000,
      description: 'Library Fee - Fall 2024',
      dueDate: new Date('2024-09-15'),
      status: 'paid' as const,
    },
    {
      id: 'fee-4',
      amount: 3000,
      description: 'Sports Fee - Fall 2024',
      dueDate: new Date('2024-10-01'),
      status: 'paid' as const,
    },
  ];

  for (const invoice of feeInvoices) {
    await prisma.feeInvoice.upsert({
      where: { id: invoice.id },
      update: {
        amount: invoice.amount,
        description: invoice.description,
        dueDate: invoice.dueDate,
        status: invoice.status,
      },
      create: {
        id: invoice.id,
        userId: user.id,
        termId: fallTerm.id,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        description: invoice.description,
        status: invoice.status,
      },
    });

    if (invoice.status === 'paid') {
      await prisma.feePayment.upsert({
        where: { id: `${invoice.id}-payment` },
        update: {
          amount: invoice.amount,
          method: 'online',
          reference: `${invoice.id.toUpperCase()}-TXN`,
          paidAt: new Date('2024-09-10'),
        },
        create: {
          id: `${invoice.id}-payment`,
          userId: user.id,
          invoiceId: invoice.id,
          amount: invoice.amount,
          method: 'online',
          reference: `${invoice.id.toUpperCase()}-TXN`,
          paidAt: new Date('2024-09-10'),
        },
      });
    }
  }

  await prisma.notification.upsert({
    where: { id: 'notif-1' },
    update: {
      title: 'Welcome to FlexPro',
      message:
        'Your student portal account has been successfully set up. Explore all the features available to manage your academic journey.',
      type: 'info',
      userId: user.id,
      isGlobal: false,
    },
    create: {
      id: 'notif-1',
      userId: user.id,
      title: 'Welcome to FlexPro',
      message:
        'Your student portal account has been successfully set up. Explore all the features available to manage your academic journey.',
      type: 'info',
      isGlobal: false,
    },
  });

  await prisma.notification.upsert({
    where: { id: 'notif-2' },
    update: {
      title: 'Fee Payment Reminder',
      message:
        'Tuition fee payment is due on December 30, 2024. Please ensure timely payment to avoid late charges.',
      type: 'warning',
      isGlobal: true,
    },
    create: {
      id: 'notif-2',
      title: 'Fee Payment Reminder',
      message:
        'Tuition fee payment is due on December 30, 2024. Please ensure timely payment to avoid late charges.',
      type: 'warning',
      isGlobal: true,
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("everything perfect");
    await prisma.$disconnect();
  });
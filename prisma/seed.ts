import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create terms
  const fallTerm = await prisma.term.upsert({
    where: { name: 'Fall 2024' },
    update: {},
    create: {
      name: 'Fall 2024',
      year: 2024,
      season: 'Fall',
      startDate: new Date('2024-08-15'),
      endDate: new Date('2024-12-20'),
      isActive: true,
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

  // Create sample user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'i230763@nu.edu.pk' },
    update: {},
    create: {
      email: 'i230763@nu.edu.pk',
      password: hashedPassword,
      firstName: 'Sahil',
      lastName: 'Latif',
      studentId: '23I-0763',
      role: 'student',
      program: 'BS Computer Science',
      semester: 6,
      cgpa: 3.45,
      bio: 'Passionate computer science student with interests in web development and AI.',
      phone: '+92-300-1234567',
      address: 'Karachi, Pakistan',
    },
  });

  // Create sample courses
  const courses = await Promise.all([
    prisma.course.upsert({
      where: { code: 'CS-401' },
      update: {},
      create: {
        code: 'CS-401',
        title: 'Software Engineering',
        description: 'Software development lifecycle, methodologies, and project management',
        creditHours: 3,
        prerequisite: 'CS-301',
        department: 'Computer Science',
        semester: 6,
        instructor: 'Dr. Ahmed Ali',
        schedule: 'MWF 09:00-10:00',
        room: 'CS-Lab-1',
      },
    }),
    prisma.course.upsert({
      where: { code: 'CS-403' },
      update: {},
      create: {
        code: 'CS-403',
        title: 'Database Systems',
        description: 'Database design, SQL, NoSQL, and database administration',
        creditHours: 4,
        prerequisite: 'CS-205',
        department: 'Computer Science',
        semester: 6,
        instructor: 'Prof. Sarah Khan',
        schedule: 'TTh 11:00-12:30',
        room: 'LR-204',
      },
    }),
    prisma.course.upsert({
      where: { code: 'CS-405' },
      update: {},
      create: {
        code: 'CS-405',
        title: 'Computer Networks',
        description: 'Network protocols, architecture, and security',
        creditHours: 3,
        prerequisite: 'CS-203',
        department: 'Computer Science',
        semester: 6,
        instructor: 'Dr. Hassan Shah',
        schedule: 'MWF 14:00-15:00',
        room: 'LR-301',
      },
    }),
  ]);

  // Create enrollments
  for (const course of courses) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId_termId: {
          userId: user.id,
          courseId: course.id,
          termId: fallTerm.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        courseId: course.id,
        termId: fallTerm.id,
        status: 'enrolled',
      },
    });
  }

  // Create sample fee invoices
  await prisma.feeInvoice.upsert({
    where: { id: 'fee-1' },
    update: {},
    create: {
      id: 'fee-1',
      userId: user.id,
      termId: fallTerm.id,
      amount: 75000,
      dueDate: new Date('2024-12-30'),
      description: 'Tuition Fee - Fall 2024',
      status: 'pending',
    },
  });

  // Create sample notifications
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: 'Welcome to FlexPro',
      message: 'Your student portal account has been successfully set up. Explore all the features available to manage your academic journey.',
      type: 'info',
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Fee Payment Reminder',
      message: 'Tuition fee payment is due on December 30, 2024. Please ensure timely payment to avoid late charges.',
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
    await prisma.$disconnect();
  });
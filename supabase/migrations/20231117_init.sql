-- Supabase schema derived from prisma/schema.prisma
create extension if not exists "pgcrypto";

create table if not exists users (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  password text not null,
  "firstName" text not null,
  "lastName" text not null,
  "studentId" text not null unique,
  role text not null default 'student',
  program text not null,
  semester integer not null default 1,
  cgpa double precision not null default 0,
  bio text,
  phone text,
  address text,
  avatar text,
  "isActive" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists terms (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  year integer not null,
  season text not null,
  "startDate" timestamptz not null,
  "endDate" timestamptz not null,
  "isActive" boolean not null default false
);

create table if not exists courses (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  title text not null,
  description text,
  "creditHours" integer not null,
  prerequisite text,
  department text not null,
  semester integer not null,
  "isActive" boolean not null default true,
  "maxCapacity" integer not null default 50,
  instructor text not null,
  schedule text not null,
  room text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists enrollments (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references users(id) on delete cascade,
  "courseId" text not null references courses(id),
  "termId" text not null references terms(id),
  status text not null default 'enrolled',
  "enrolledAt" timestamptz not null default now(),
  unique ("userId", "courseId", "termId")
);

create table if not exists transcripts (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references users(id) on delete cascade,
  "courseId" text not null references courses(id),
  "termId" text not null references terms(id),
  grade text not null,
  "gradePoints" double precision not null,
  status text not null default 'final',
  "createdAt" timestamptz not null default now(),
  unique ("userId", "courseId", "termId", status)
);

create table if not exists attendances (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references users(id) on delete cascade,
  "courseId" text not null references courses(id),
  "termId" text not null references terms(id),
  date timestamptz not null,
  status text not null,
  "markedBy" text,
  "createdAt" timestamptz not null default now(),
  unique ("userId", "courseId", "termId", date)
);

create table if not exists notifications (
  id text primary key default gen_random_uuid()::text,
  "userId" text references users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  "isRead" boolean not null default false,
  "isGlobal" boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create table if not exists fee_invoices (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references users(id) on delete cascade,
  "termId" text not null references terms(id),
  amount numeric(12,2) not null,
  "dueDate" timestamptz not null,
  description text not null,
  status text not null default 'pending',
  "createdAt" timestamptz not null default now()
);

create table if not exists fee_payments (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references users(id) on delete cascade,
  "invoiceId" text not null references fee_invoices(id),
  amount numeric(12,2) not null,
  method text not null,
  reference text,
  "paidAt" timestamptz not null default now()
);

create table if not exists feedbacks (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references users(id) on delete cascade,
  "courseId" text not null references courses(id),
  "termId" text not null references terms(id),
  rating integer not null,
  comment text,
  "isAnonymous" boolean not null default false,
  "submittedAt" timestamptz not null default now(),
  unique ("userId", "courseId", "termId")
);

create table if not exists grade_requests (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references users(id) on delete cascade,
  "termId" text not null references terms(id),
  "courseCode" text not null,
  "currentGrade" text not null,
  "requestedGrade" text not null,
  reason text not null,
  status text not null default 'pending',
  "adminNotes" text,
  "submittedAt" timestamptz not null default now(),
  "reviewedAt" timestamptz
);

create table if not exists study_plans (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null references users(id) on delete cascade,
  title text not null,
  "isDefault" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists study_plan_items (
  id text primary key default gen_random_uuid()::text,
  "studyPlanId" text not null references study_plans(id) on delete cascade,
  "courseId" text not null references courses(id),
  semester integer not null,
  year integer not null,
  "order" integer not null default 0,
  unique ("studyPlanId", "courseId")
);

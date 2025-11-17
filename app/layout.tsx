import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/server';
import { AppProvider } from '@/components/providers/app-provider';
import type { User as StoreUser } from '@/store/user-slice';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FlexPro - Student Portal',
  description: 'Modern student portal inspired by FAST Flex',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userMetadata = session?.user.user_metadata ?? {};

  const initialUser: StoreUser | null = session
    ? {
        id: session.user.id,
        email: session.user.email ?? '',
        firstName: userMetadata.firstName ?? userMetadata.first_name ?? '',
        lastName: userMetadata.lastName ?? userMetadata.last_name ?? '',
        studentId: userMetadata.studentId ?? '',
        role: userMetadata.role ?? 'student',
        program: userMetadata.program ?? '',
        semester: Number(userMetadata.semester ?? 1),
        cgpa: Number(userMetadata.cgpa ?? 0),
        bio: userMetadata.bio,
        phone: userMetadata.phone,
        address: userMetadata.address,
        avatar: userMetadata.avatar,
      }
    : null;

  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "bg-gray-950 text-white antialiased")}>
        <AppProvider initialUser={initialUser}>{children}</AppProvider>
      </body>
    </html>
  );
}
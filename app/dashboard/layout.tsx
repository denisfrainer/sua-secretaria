import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/storefront/DashboardHeader';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Guard: Server-side redirect to login if session is empty
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBFB] text-slate-800 font-sans flex flex-col antialiased">
      <DashboardHeader userEmail={user.email || 'Manicure'} />
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {children}
      </div>
    </div>
  );
}

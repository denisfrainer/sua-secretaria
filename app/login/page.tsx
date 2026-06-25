import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoginForm from '@/components/storefront/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already authenticated, redirect straight to the Dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen w-full bg-[#FFFBFB] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Visual background accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-100/20 rounded-full blur-3xl -z-10" />
      
      <LoginForm />
    </main>
  );
}

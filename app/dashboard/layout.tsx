import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/admin/login'); // Defaulting to the existing /admin/login endpoint
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-source">
      {/* Protected minimal header */}
      <header className="w-full h-16 bg-[#fafafa]/90 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-black text-lg font-bold tracking-tight">
          meatende.ai
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-black/50 hidden sm:block">
            {session.user.email}
          </span>
        </div>
      </header>

      {/* Main content slot */}
      <main className="flex-1 flex flex-col items-center relative w-full h-full">
        {children}
      </main>
    </div>
  );
}

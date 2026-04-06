import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login'); // Defaulting to the existing /admin/login endpoint
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-source">
      {/* Protected minimal header */}
      <header className="w-full h-16 bg-[#fafafa]/90 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-6 sticky top-0 z-50">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-black text-lg font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/assets/robot.png" 
            width={24} 
            height={24} 
            alt="Robot Logo" 
            className="object-contain"
          />
          meatende.ai
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-black/50 hidden md:block">
            {user.email}
          </span>
          <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
            <Menu size={20} className="text-black/70" />
          </button>
        </div>
      </header>

      {/* Main content slot */}
      <main className="flex-1 flex flex-col items-center relative w-full h-full">
        {children}
      </main>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { DashboardHeaderMenu } from '@/components/DashboardHeaderMenu';
import { MobileDrawerMenu } from '@/components/MobileDrawerMenu';

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
          <div className="hidden md:block">
            <DashboardHeaderMenu email={user.email || 'Admin'} />
          </div>
          <div className="md:hidden">
            <MobileDrawerMenu email={user.email || 'Admin'} />
          </div>
        </div>
      </header>

      {/* Main content slot */}
      <main className="flex-1 flex flex-col items-center relative w-full h-full">
        {children}
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Menu, X, LayoutDashboard, Settings, LogOut, History, User, CreditCard, Lock } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

export function MobileDrawerMenu({ email }: { email: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Close drawer when path changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { label: 'Página Inicial', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Perfil', href: '/dashboard/settings/profile', icon: User },
    { label: 'Planos', href: '/dashboard/settings/payments', icon: CreditCard },
    { label: 'Alterar senha', href: '/dashboard/settings/profile', icon: Lock },
  ];

  const [tier, setTier] = useState<string>('STARTER');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchTier = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setTier(profileData.plan_tier || 'STARTER');
        }
      }
    };
    fetchTier();
  }, [supabase]);

  useEffect(() => {
    if (profile) {
      console.log('[MENU_RENDER] Displaying plan tier:', {
        email: profile.email || email,
        tier: profile.plan_tier,
        timestamp: new Date().toISOString()
      });
    }
  }, [profile, email]);

  const initial = profile?.display_name ? profile.display_name[0].toUpperCase() : (email ? email[0].toUpperCase() : 'U');

  // Capitalize helper
  const formatTier = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

  return (
    <>
      {/* HAMBURGER BUTTON */}
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 -mr-2 hover:bg-black/5 rounded-lg transition-colors md:hidden"
        aria-label="Open Menu"
      >
        <Menu size={24} className="text-black/70" />
      </button>

      {/* BACKDROP */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* DRAWER */}
      <div 
        className={`fixed top-0 right-0 w-[280px] h-fit max-h-screen bg-white z-[100] shadow-2xl rounded-bl-3xl overflow-hidden transform transition-transform duration-[750ms] ease-in-out flex flex-col md:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* HEADER */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-black/5 shrink-0">
          <span className="font-bold text-lg text-black">Menu</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X size={24} className="text-black/70" />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="overflow-y-auto px-4 py-6">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <link.icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* STICKY FOOTER (User Info & Logout) */}
        <div className="border-t border-black/5 p-6 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 border border-white/20 text-white flex items-center justify-center font-bold shadow-sm shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : initial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-900 truncate">
                {profile?.display_name || 'Usuário'}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                Plano {formatTier(tier)}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-xl text-red-600 font-bold text-sm shadow-sm hover:bg-red-50 transition-all active:scale-[0.98]"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </div>
    </>
  );
}

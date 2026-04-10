'use client';

import { useState, useRef, useEffect } from 'react';
import { User, CreditCard, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function DashboardHeaderMenu({ email }: { email: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const [tier, setTier] = useState<string>('STARTER');
  const [profile, setProfile] = useState<any>(null);

  const initial = profile?.display_name ? profile.display_name[0].toUpperCase() : (email ? email[0].toUpperCase() : 'U');

  useEffect(() => {
    async function fetchTier() {
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
    }
    fetchTier();
  }, [supabase]);

  useEffect(() => {
    if (profile) {
      console.log('[MENU_RENDER] Displaying plan tier (Desktop):', {
        email: profile.email || email,
        tier: profile.plan_tier,
        timestamp: new Date().toISOString()
      });
    }
  }, [profile, email]);

  // Capitalize helper
  const formatTier = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 border border-white/20 text-white flex items-center justify-center font-bold shadow-sm hover:shadow-md transition-all active:scale-95 overflow-hidden"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
        ) : initial}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 border-b border-gray-100 flex flex-col mb-1 max-w-[220px]">
            <span className="text-sm font-bold truncate text-gray-900 leading-tight">
              {profile?.display_name || 'Usuário'}
            </span>
            <span className="text-xs text-gray-400 truncate mb-1">{email}</span>
            <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
              Plano {formatTier(tier)}
            </span>
          </div>

          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
            onClick={() => {
              setIsOpen(false);
              router.push('/dashboard/settings/profile');
            }}
          >
            <User size={16} className="text-gray-400" />
            Minha Conta
          </button>
          
          <button 
            disabled
            className="w-full text-left px-4 py-2 text-sm text-gray-400 flex items-center gap-2 cursor-not-allowed"
          >
            <CreditCard size={16} className="text-gray-300" />
            Assinatura (Em breve)
          </button>

          <div className="h-px bg-gray-100 my-1"></div>

          <button 
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition font-medium"
          >
            <LogOut size={16} className="text-red-500" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

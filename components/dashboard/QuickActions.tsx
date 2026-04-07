'use client';

import { useEffect, useState } from 'react';
import { Calendar, ClipboardList, Link as LinkIcon, Settings, Link2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuickActions() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      }
    };
    fetchUser();
  }, [supabase]);

  const copyToClipboard = async () => {
    if (!userId) return;
    
    const baseUrl = window.location.origin;
    const bookingUrl = `${baseUrl}/agendar/${userId}`;
    
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      console.log('[CLIPBOARD] Link copied:', bookingUrl);
    } catch (err) {
      console.error('[CLIPBOARD] Failed to copy:', err);
    }
  };

  const actions = [
    {
      title: 'Agenda',
      icon: <Calendar className="w-5 h-5" />,
      colorClass: 'text-blue-600 bg-blue-50 ring-blue-100',
      action: () => {
        console.log('[NAVIGATION] Navigating to /dashboard/agenda');
        router.push('/dashboard/agenda');
      },
    },
    {
      title: 'Link de agendamento',
      icon: <Link2 className="w-5 h-5" />,
      colorClass: 'text-rose-600 bg-rose-50 ring-rose-100',
      action: copyToClipboard,
    },
    {
      title: 'Serviços',
      icon: <LinkIcon className="w-5 h-5" />,
      colorClass: 'text-orange-600 bg-orange-50 ring-orange-100',
      action: () => {
        console.log('[NAV] Going to catalog');
        router.push('/dashboard/settings/catalog');
      },
    },
    {
      title: 'Configurações',
      icon: <Settings className="w-5 h-5" />,
      colorClass: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
      action: () => {
        console.log('[NAV] Going to settings hub');
        router.push('/dashboard/settings');
      },
    },
  ];

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3 mt-6">
        {actions.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="flex flex-col items-start p-4 w-full bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-sm hover:border-gray-200 active:scale-[0.98] transition-all duration-200 group text-left"
          >
            <div 
              className={`p-2.5 rounded-xl mb-3 ring-1 ring-inset transition-colors duration-200 ${item.colorClass}`}
            >
              {item.icon}
            </div>
            <span className="font-semibold text-gray-950 text-base tracking-tight">
              {item.title}
            </span>
          </button>
        ))}
      </div>

      {/* Elegant Framer Motion Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-2xl shadow-2xl shadow-black/20 border border-white/10"
          >
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">Link de agendamento copiado!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

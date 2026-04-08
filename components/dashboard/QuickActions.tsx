'use client';

import { useEffect, useState } from 'react';
import { Calendar, Link as LinkIcon, Settings, Link2, Check } from 'lucide-react';
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
      console.log('[UI_ACTION] Scheduling link successfully copied to clipboard');
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
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3, 
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.05 * index
            }}
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
          </motion.button>
        ))}
      </div>

      {/* Elegant Framer Motion Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%', scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 10, x: '-50%', scale: 0.95 }}
            className="fixed bottom-10 left-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100"
          >
            <Check size={16} className="text-green-500" />
            <span className="text-sm font-medium tracking-tight">Link copiado!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

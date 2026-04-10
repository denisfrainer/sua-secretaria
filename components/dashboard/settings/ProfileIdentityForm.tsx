'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Smile, Save, Loader2 } from 'lucide-react';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';
import { AvatarUpload } from '@/components/dashboard/settings/AvatarUpload';
import { DashboardToast } from '@/components/ui/DashboardToast';
import { useRouter } from 'next/navigation';

export function ProfileIdentityForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
      setLoading(false);
    }
    fetchProfile();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    console.log('[PROFILE_UPDATE] User changing display name:', { to: displayName });

    const { error } = await supabase
      .from('profiles')
      .update({ 
        display_name: displayName,
        avatar_url: avatarUrl 
      })
      .eq('id', userId);

    if (error) {
      setToast({ show: true, message: 'Erro ao salvar perfil.', type: 'error' });
    } else {
      setToast({ show: true, message: 'Identidade atualizada com sucesso!', type: 'success' });
      router.refresh();
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600 opacity-20" size={24} /></div>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
      <div className="flex flex-col md:flex-row items-center gap-10">
        <AvatarUpload 
          userId={userId || ''} 
          currentUrl={avatarUrl} 
          onUploadComplete={(url) => setAvatarUrl(url)} 
        />
        
        <div className="flex-1 flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-1">
             <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">Identidade Visual</h3>
             <p className="text-sm font-medium text-slate-400">Como você aparece para seus clientes e no dashboard.</p>
          </div>
          
          <StudioInput 
            label="Nome de Exibição" 
            placeholder="Ex: Dra. Ana Paula, Studio Glow, etc."
            value={displayName} 
            onChange={setDisplayName}
            icon={<Smile size={18} />}
          />
          
          <button
            type="submit"
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-blue-600 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Guardando...' : 'Salvar Identidade'}
          </button>
        </div>
      </div>
      
      <DashboardToast 
        isVisible={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ ...toast, show: false })} 
      />
    </form>
  );
}

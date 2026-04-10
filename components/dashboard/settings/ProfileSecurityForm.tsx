'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';
import { DashboardToast } from '@/components/ui/DashboardToast';

export function ProfileSecurityForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  
  const supabase = createClient();

  // Simple strength meter logic
  const getStrength = (pw: string) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length > 7) s += 1;
    if (/[A-Z]/.test(pw)) s += 1;
    if (/[0-9]/.test(pw)) s += 1;
    if (/[^A-Za-z0-9]/.test(pw)) s += 1;
    return s; // 0-4
  };

  const strength = getStrength(password);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setToast({ show: true, message: 'As senhas não coincidem.', type: 'error' });
      return;
    }

    if (password.length < 8) {
      setToast({ show: true, message: 'A senha deve ter pelo menos 8 caracteres.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[AUTH_UPDATE] User attempting password change:', user?.id);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setToast({ show: true, message: 'Senha atualizada com sucesso!', type: 'success' });
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('[AUTH_UPDATE] Error changing password:', error.message);
      setToast({ show: true, message: 'Erro ao atualizar senha.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const ToggleIcon = showPassword ? EyeOff : Eye;

  return (
    <form onSubmit={handleUpdatePassword} className="flex flex-col gap-8 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
      {/* Visual background hint */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[4rem] -z-10 flex items-center justify-center translate-x-12 -translate-y-12">
        <ShieldCheck size={80} className="text-slate-100" />
      </div>

      <div className="flex flex-col gap-1 pr-12">
        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">Segurança da Conta</h3>
        <p className="text-sm font-medium text-slate-400">Proteja seu acesso atualizando sua senha regularmente.</p>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-md">
        <div className="relative">
          <StudioInput 
            label="Nova Senha" 
            type={showPassword ? 'text' : 'password'}
            placeholder="No mínimo 8 caracteres"
            value={password} 
            onChange={setPassword}
            icon={<Lock size={18} />}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 bottom-4 p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
          >
            <ToggleIcon size={18} />
          </button>
        </div>

        {/* Strength Meter */}
        {password && (
          <div className="flex gap-1.5 px-1 mt-[-10px]">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < strength ? (strength <= 2 ? 'bg-orange-400' : 'bg-emerald-400') : 'bg-slate-100'}`} 
              />
            ))}
          </div>
        )}

        <StudioInput 
          label="Confirmar Nova Senha" 
          type={showPassword ? 'text' : 'password'}
          placeholder="Repita a nova senha"
          value={confirmPassword} 
          onChange={setConfirmPassword}
          icon={<Lock size={18} />}
        />

        <button
          type="submit"
          disabled={saving || !password}
          className="w-fit px-8 h-14 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black active:scale-95 disabled:opacity-50 transition-all shadow-lg"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
          {saving ? 'Atualizando...' : 'confirmar nova senha'}
        </button>
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

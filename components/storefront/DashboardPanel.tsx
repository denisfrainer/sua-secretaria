'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
  Palette,
  Gift,
  Ticket,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Percent,
  Layers,
  ToggleLeft,
  ToggleRight,
  Clock,
  ShieldCheck,
  Search,
  Check,
  X,
  Phone,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import type { Tenant, Premio } from '@/lib/supabase/types';
import {
  upsertTenantBranding,
  createPremio,
  updatePremio,
  deletePremio,
  togglePremioStatus,
  searchCoupons,
  redeemCoupon,
  type CouponWithPremio
} from '@/app/dashboard/actions';

interface DashboardPanelProps {
  userId: string;
  initialTenant: Tenant | null;
  initialPremios: Premio[];
  initialCoupons: CouponWithPremio[];
}

const PRESET_COLORS = [
  '#f43f5e', // Rose
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#64748b', // Slate
];

export default function DashboardPanel({
  userId,
  initialTenant,
  initialPremios,
  initialCoupons
}: DashboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'branding' | 'premios' | 'cupons'>('branding');
  const [isPending, startTransition] = useTransition();

  // Status Banners
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ----------------------------------------------------
  // 🏢 BRANDING STATE
  // ----------------------------------------------------
  const [tenantName, setTenantName] = useState(initialTenant?.name || '');
  const [tenantSlug, setTenantSlug] = useState(initialTenant?.slug || '');
  const [tenantWhatsapp, setTenantWhatsapp] = useState(initialTenant?.whatsapp || '');
  const [tenantLogo, setTenantLogo] = useState(initialTenant?.logo_url || '');
  const [primaryColor, setPrimaryColor] = useState(initialTenant?.primary_color || '#f43f5e');
  const [secondaryColor, setSecondaryColor] = useState(initialTenant?.secondary_color || '#fda4af');
  const [backgroundColor, setBackgroundColor] = useState(initialTenant?.background_color || '#fffbfb');
  const [cooldownHours, setCooldownHours] = useState(String(initialTenant?.cooldown_hours ?? 24));

  // ----------------------------------------------------
  // 🎁 PREMIOS STATE
  // ----------------------------------------------------
  const [premiosList, setPremiosList] = useState<Premio[]>(initialPremios);
  const [editingPremioId, setEditingPremioId] = useState<string | null>(null);
  const [premioTitle, setPremioTitle] = useState('');
  const [premioDesc, setPremioDesc] = useState('');
  const [premioWeight, setPremioWeight] = useState('10');
  const [premioStock, setPremioStock] = useState('100');
  const [isUnlimitedStock, setIsUnlimitedStock] = useState(false);
  const [premioColor, setPremioColor] = useState('#f43f5e');
  const [premioTextColor, setPremioTextColor] = useState('#ffffff');
  const [isLosingSlice, setIsLosingSlice] = useState(false);
  const [isPremioActive, setIsPremioActive] = useState(true);

  // ----------------------------------------------------
  // 🎟️ CUPONS STATE
  // ----------------------------------------------------
  const [couponsList, setCouponsList] = useState<CouponWithPremio[]>(initialCoupons || []);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all');
  const [isSearchingCoupons, setIsSearchingCoupons] = useState(false);
  const [confirmRedeemCoupon, setConfirmRedeemCoupon] = useState<CouponWithPremio | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // ----------------------------------------------------
  // 📊 PROBABILITY CALCULATIONS
  // ----------------------------------------------------
  const activePremios = premiosList.filter(p => p.is_active);
  const totalActiveWeight = activePremios.reduce(
    (acc, p) => acc + Math.max(p.probability_weight, 0),
    0
  );

  const calculatePercentage = (weight: number) => {
    if (totalActiveWeight === 0) return '0.0';
    return ((Math.max(weight, 0) / totalActiveWeight) * 100).toFixed(1);
  };

  // ----------------------------------------------------
  // 🏢 SAVE BRANDING
  // ----------------------------------------------------
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!tenantName.trim() || !tenantSlug.trim() || !tenantWhatsapp.trim()) {
      showError('Nome, Link (Slug) e WhatsApp são obrigatórios.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await upsertTenantBranding({
          name: tenantName,
          slug: tenantSlug,
          whatsapp: tenantWhatsapp,
          logo_url: tenantLogo || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          background_color: backgroundColor,
          cooldown_hours: parseInt(cooldownHours, 10) || 24
        });

        if (!res.success) throw new Error(res.error || 'Erro ao salvar branding.');
        showSuccess('Identidade visual e configurações salvas com sucesso!');
      } catch (err: any) {
        showError(err.message || 'Falha ao salvar configurações.');
      }
    });
  };

  // ----------------------------------------------------
  // 🎁 PREMIOS EVENT HANDLERS
  // ----------------------------------------------------
  const resetPremioForm = () => {
    setEditingPremioId(null);
    setPremioTitle('');
    setPremioDesc('');
    setPremioWeight('10');
    setPremioStock('100');
    setIsUnlimitedStock(false);
    setPremioColor('#f43f5e');
    setPremioTextColor('#ffffff');
    setIsLosingSlice(false);
    setIsPremioActive(true);
  };

  const handleEditPremio = (premio: Premio) => {
    setEditingPremioId(premio.id);
    setPremioTitle(premio.title);
    setPremioDesc(premio.description || '');
    setPremioWeight(String(premio.probability_weight));
    if (premio.initial_stock === -1) {
      setIsUnlimitedStock(true);
      setPremioStock('100');
    } else {
      setIsUnlimitedStock(false);
      setPremioStock(String(premio.initial_stock));
    }
    setPremioColor(premio.color_hex);
    setPremioTextColor(premio.text_color_hex || '#ffffff');
    setIsLosingSlice(premio.is_losing_slice);
    setIsPremioActive(premio.is_active);
  };

  const handleSavePremio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!premioTitle.trim()) {
      showError('O título do prêmio é obrigatório.');
      return;
    }

    const weightNum = parseInt(premioWeight, 10);
    if (isNaN(weightNum) || weightNum < 0) {
      showError('O peso de probabilidade deve ser um número maior ou igual a zero.');
      return;
    }

    const stockNum = isUnlimitedStock ? -1 : parseInt(premioStock, 10);
    if (!isUnlimitedStock && (isNaN(stockNum) || stockNum < 0)) {
      showError('Informe uma quantidade válida para o estoque.');
      return;
    }

    startTransition(async () => {
      try {
        if (editingPremioId) {
          await updatePremio(editingPremioId, {
            title: premioTitle,
            description: premioDesc || null,
            probability_weight: weightNum,
            initial_stock: stockNum,
            color_hex: premioColor,
            text_color_hex: premioTextColor,
            is_losing_slice: isLosingSlice,
            is_active: isPremioActive
          });

          setPremiosList(prev =>
            prev.map(p =>
              p.id === editingPremioId
                ? {
                    ...p,
                    title: premioTitle,
                    description: premioDesc || null,
                    probability_weight: weightNum,
                    initial_stock: stockNum,
                    current_stock: isUnlimitedStock ? -1 : Math.min(p.current_stock, stockNum),
                    color_hex: premioColor,
                    text_color_hex: premioTextColor,
                    is_losing_slice: isLosingSlice,
                    is_active: isPremioActive
                  }
                : p
            )
          );
          showSuccess('Prêmio atualizado com sucesso!');
        } else {
          const res = await createPremio({
            title: premioTitle,
            description: premioDesc || null,
            probability_weight: weightNum,
            initial_stock: stockNum,
            color_hex: premioColor,
            text_color_hex: premioTextColor,
            is_losing_slice: isLosingSlice,
            is_active: isPremioActive
          });

          if (res.premio) {
            setPremiosList(prev => [...prev, res.premio!]);
          }
          showSuccess('Novo prêmio cadastrado na roleta!');
        }

        resetPremioForm();
      } catch (err: any) {
        showError(err.message || 'Erro ao salvar prêmio.');
      }
    });
  };

  const handleDeletePremio = async (premioId: string) => {
    if (!confirm('Deseja realmente remover esta fatia de prêmio da roleta?')) return;

    startTransition(async () => {
      try {
        await deletePremio(premioId);
        setPremiosList(prev => prev.filter(p => p.id !== premioId));
        showSuccess('Prêmio removido da roleta.');
      } catch (err: any) {
        showError(err.message || 'Erro ao excluir prêmio.');
      }
    });
  };

  const handleToggleStatus = async (premio: Premio) => {
    const nextStatus = !premio.is_active;
    startTransition(async () => {
      try {
        await togglePremioStatus(premio.id, nextStatus);
        setPremiosList(prev =>
          prev.map(p => (p.id === premio.id ? { ...p, is_active: nextStatus } : p))
        );
        showSuccess(nextStatus ? 'Prêmio ativado na roleta!' : 'Prêmio pausado.');
      } catch (err: any) {
        showError(err.message || 'Erro ao alternar status.');
      }
    });
  };

  // ----------------------------------------------------
  // 🎟️ DEBOUNCED SEARCH FOR COUPONS
  // ----------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'cupons') return;

    const timer = setTimeout(async () => {
      setIsSearchingCoupons(true);
      try {
        const results = await searchCoupons(couponSearchQuery, userId);
        setCouponsList(results);
      } catch (err: any) {
        console.error('Failed to search coupons:', err);
      } finally {
        setIsSearchingCoupons(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [couponSearchQuery, activeTab, userId]);

  // Execute Redemption
  const handleConfirmRedeem = async () => {
    if (!confirmRedeemCoupon) return;
    const couponToRedeem = confirmRedeemCoupon;

    startTransition(async () => {
      try {
        const res = await redeemCoupon(couponToRedeem.id, userId);
        if (res.cupom) {
          setCouponsList(prev =>
            prev.map(c => (c.id === couponToRedeem.id ? res.cupom! : c))
          );
          showSuccess(`Cupom ${couponToRedeem.code} validado e resgatado com sucesso!`);
        }
        setConfirmRedeemCoupon(null);
      } catch (err: any) {
        showError(err.message || 'Erro ao resgatar cupom.');
        setConfirmRedeemCoupon(null);
      }
    });
  };

  // Filtered coupons
  const filteredCoupons = couponsList.filter(c => {
    if (couponFilter === 'all') return true;
    return c.status === couponFilter;
  });

  return (
    <div className="w-full flex flex-col md:flex-row gap-8 items-start pb-24 md:pb-0">
      {/* Mobile Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-rose-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-4 py-3 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-all cursor-pointer ${
            activeTab === 'branding'
              ? 'text-rose-600 scale-105 font-bold'
              : 'text-slate-400 font-medium'
          }`}
        >
          <Palette size={20} className={activeTab === 'branding' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] tracking-tight">Identidade</span>
        </button>

        <button
          onClick={() => setActiveTab('premios')}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-all cursor-pointer ${
            activeTab === 'premios'
              ? 'text-rose-600 scale-105 font-bold'
              : 'text-slate-400 font-medium'
          }`}
        >
          <Gift size={20} className={activeTab === 'premios' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] tracking-tight">Prêmios</span>
        </button>

        <button
          onClick={() => setActiveTab('cupons')}
          className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-all cursor-pointer ${
            activeTab === 'cupons'
              ? 'text-rose-600 scale-105 font-bold'
              : 'text-slate-400 font-medium'
          }`}
        >
          <Ticket size={20} className={activeTab === 'cupons' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] tracking-tight">Cupons</span>
        </button>
      </div>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden md:flex w-64 shrink-0 flex-col gap-2 p-2 bg-white rounded-3xl border border-rose-100/60 shadow-sm">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-black transition-all border cursor-pointer w-full text-left ${
            activeTab === 'branding'
              ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-sm'
              : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Palette size={16} />
          Identidade & Roleta
        </button>

        <button
          onClick={() => setActiveTab('premios')}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-black transition-all border cursor-pointer w-full text-left ${
            activeTab === 'premios'
              ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-sm'
              : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Gift size={16} />
          Prêmios & Probabilidades
        </button>

        <button
          onClick={() => setActiveTab('cupons')}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-black transition-all border cursor-pointer w-full text-left ${
            activeTab === 'cupons'
              ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-sm'
              : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Ticket size={16} />
          Validação de Cupons
        </button>

        {/* Tenant Plan Box */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50/50 border border-rose-100/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">
              Plano Ativo
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider">
              {initialTenant?.plan_tier || 'STARTER'}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-700 mt-2">Roleta Vantajosa Pro</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sorteios ilimitados & antiburla</p>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 w-full flex flex-col gap-6">
        {/* Success/Error Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-2.5 text-sm font-semibold animate-in slide-in-from-top-4 duration-300">
            <CheckCircle className="shrink-0 mt-0.5 text-emerald-600" size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-2.5 text-sm font-semibold animate-in slide-in-from-top-4 duration-300">
            <AlertCircle className="shrink-0 mt-0.5 text-rose-600" size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Card Container */}
        <div className="bg-white rounded-3xl border border-rose-100/60 shadow-sm p-6 sm:p-8 relative">
          {isPending && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-30 rounded-3xl">
              <Loader2 className="animate-spin text-rose-600" size={32} />
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 1: IDENTIDADE VISUAL & BRANDING                               */}
          {/* ================================================================= */}
          {activeTab === 'branding' && (
            <form onSubmit={handleSaveBranding} className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Identidade Visual & Configurações da Roleta
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Defina as cores, link de divulgação e regras gerais da sua roleta de prêmios.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Store Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Nome do Estabelecimento
                  </label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={e => setTenantName(e.target.value)}
                    required
                    placeholder="Ex: Padaria Bela Vista"
                    className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                {/* WhatsApp */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    WhatsApp para Resgate de Cupons (com DDD)
                  </label>
                  <input
                    type="tel"
                    value={tenantWhatsapp}
                    onChange={e => setTenantWhatsapp(e.target.value)}
                    required
                    placeholder="Ex: 5541999999999"
                    className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                {/* Public Roulette Link / Slug */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Link Público da sua Roleta
                  </label>
                  <div className="flex items-center bg-white border border-slate-200/80 rounded-2xl overflow-hidden focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100 transition-all">
                    <span className="pl-4 pr-1 text-sm font-bold text-slate-400 select-none">
                      roletavantajosa.com.br/
                    </span>
                    <input
                      type="text"
                      value={tenantSlug}
                      onChange={e => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      required
                      placeholder="minha-loja"
                      className="w-full pr-4 py-3 bg-transparent text-sm font-bold outline-none text-slate-700 placeholder:text-slate-300 font-mono"
                    />
                    {tenantSlug && (
                      <a
                        href={`/${tenantSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-3 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <ExternalLink size={13} className="stroke-[2.5]" />
                        Testar Roleta
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Compartilhe este link no Instagram, WhatsApp ou imprima um QR Code para o balcão.
                  </p>
                </div>

                {/* Logo URL */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    URL da Logo do Estabelecimento (Opcional)
                  </label>
                  <input
                    type="url"
                    value={tenantLogo}
                    onChange={e => setTenantLogo(e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                    className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                {/* Theme Colors */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Cor Primária da Marca
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 uppercase"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Intervalo de Giro por Cliente (Horas)
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      max="720"
                      value={cooldownHours}
                      onChange={e => setCooldownHours(e.target.value)}
                      className="w-32 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                    />
                    <span className="text-xs font-semibold text-slate-400">horas (Padrão: 24h)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-fit self-end px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm shadow-md shadow-rose-200 active:scale-[0.98] transition-all cursor-pointer mt-4"
              >
                Salvar Configurações
              </button>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: PRÊMIOS & PROBABILIDADES                                   */}
          {/* ================================================================= */}
          {activeTab === 'premios' && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Gestão de Prêmios & Fatias da Roleta
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Cadastre os prêmios, defina os pesos de probabilidade e personalize as cores de cada fatia.
                </p>
              </div>

              {/* Visual Probability Distribution Bar */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Percent size={14} className="text-rose-500" />
                    Distribuição Real das Chances da Roleta
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    Peso Total Ativo: <strong className="text-slate-700">{totalActiveWeight}</strong>
                  </span>
                </div>

                {activePremios.length === 0 ? (
                  <p className="text-xs font-medium text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    ⚠️ Nenhuma fatia ativa configurada. A roleta não poderá ser girada até que você adicione ao menos um prêmio ativo.
                  </p>
                ) : (
                  <>
                    <div className="w-full h-7 rounded-xl overflow-hidden flex shadow-inner border border-slate-200/60 bg-slate-100">
                      {activePremios.map(p => {
                        const pct = calculatePercentage(p.probability_weight);
                        if (parseFloat(pct) === 0) return null;
                        return (
                          <div
                            key={p.id}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: p.color_hex,
                              color: p.text_color_hex || '#ffffff'
                            }}
                            className="h-full flex items-center justify-center text-[10px] font-black px-1 truncate transition-all relative group cursor-pointer"
                            title={`${p.title}: ${pct}% (Peso ${p.probability_weight})`}
                          >
                            <span>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {activePremios.map(p => (
                        <div
                          key={p.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.color_hex }}
                          />
                          <span className="truncate max-w-[120px]">{p.title}:</span>
                          <span className="text-rose-600 font-black">{calculatePercentage(p.probability_weight)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Prize Form (Add / Edit) */}
              <form onSubmit={handleSavePremio} className="p-5 rounded-2xl bg-rose-50/40 border border-rose-100 flex flex-col gap-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Sparkles size={16} className="text-rose-500" />
                  {editingPremioId ? 'Editando Fatia Selecionada' : 'Adicionar Nova Fatia de Prêmio'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">
                      Título do Prêmio (Exibido na Fatia)
                    </label>
                    <input
                      type="text"
                      value={premioTitle}
                      onChange={e => setPremioTitle(e.target.value)}
                      required
                      placeholder="Ex: 15% OFF em Toda Loja"
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase">
                        Peso de Probabilidade
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Quanto maior o peso, maior a chance
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={premioWeight}
                      onChange={e => setPremioWeight(e.target.value)}
                      required
                      placeholder="Ex: 10"
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase">
                        Estoque Disponível
                      </label>
                      <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isUnlimitedStock}
                          onChange={e => setIsUnlimitedStock(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        Estoque Ilimitado
                      </label>
                    </div>
                    <input
                      type="number"
                      min="0"
                      disabled={isUnlimitedStock}
                      value={isUnlimitedStock ? '' : premioStock}
                      onChange={e => setPremioStock(e.target.value)}
                      placeholder={isUnlimitedStock ? 'Sem limite de estoque' : 'Ex: 50'}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">
                      Cor da Fatia na Roleta
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={premioColor}
                        onChange={e => setPremioColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {PRESET_COLORS.map(c => (
                          <button
                            type="button"
                            key={c}
                            onClick={() => setPremioColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                              premioColor === c ? 'border-slate-800 scale-110 shadow-sm' : 'border-white'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">
                      Regras ou Descrição do Cupom (Opcional)
                    </label>
                    <input
                      type="text"
                      value={premioDesc}
                      onChange={e => setPremioDesc(e.target.value)}
                      placeholder="Ex: Válido para compras acima de R$ 50 até domingo."
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-rose-500 transition-all text-slate-700"
                    />
                  </div>

                  <div className="flex items-center gap-2 md:col-span-2 pt-1">
                    <input
                      type="checkbox"
                      id="isLosingSliceCheck"
                      checked={isLosingSlice}
                      onChange={e => setIsLosingSlice(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="isLosingSliceCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Esta é uma fatia de "Tente Novamente" (Não emite cupom promocional)
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-2">
                  {editingPremioId && (
                    <button
                      type="button"
                      onClick={resetPremioForm}
                      className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs cursor-pointer hover:bg-slate-50"
                    >
                      Cancelar Edição
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-sm hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    {editingPremioId ? 'Atualizar Fatia' : 'Inserir Fatia na Roleta'}
                  </button>
                </div>
              </form>

              {/* Existing Prizes List */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Layers size={16} className="text-slate-400" />
                  Fatias Cadastradas ({premiosList.length})
                </h3>

                {premiosList.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-rose-100 rounded-2xl text-center text-slate-400 text-sm font-medium flex flex-col items-center gap-2">
                    <Gift size={32} className="text-rose-200" />
                    <span>Nenhuma fatia de prêmio cadastrada ainda.</span>
                    <span className="text-xs text-slate-400">Use o formulário acima para adicionar os prêmios da sua roleta.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {premiosList.map(premio => (
                      <div
                        key={premio.id}
                        className={`flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm transition-all ${
                          premio.is_active ? 'border-slate-200/80 hover:border-rose-200' : 'border-slate-100 opacity-60 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                          <div
                            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-black text-xs shadow-sm"
                            style={{ backgroundColor: premio.color_hex }}
                          >
                            <Gift size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 truncate text-sm">
                                {premio.title}
                              </h4>
                              {premio.is_losing_slice && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-wider shrink-0">
                                  Tente Novamente
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                              {premio.description || 'Sem descrição'}
                            </p>

                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs font-extrabold text-rose-600 flex items-center gap-1">
                                <Percent size={12} />
                                {premio.is_active ? `${calculatePercentage(premio.probability_weight)}% de chance` : 'Pausado'}
                              </span>
                              <span className="text-xs font-bold text-slate-500">
                                Estoque: {premio.initial_stock === -1 ? 'Ilimitado' : `${premio.current_stock} restantes`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleToggleStatus(premio)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                            title={premio.is_active ? 'Pausar prêmio' : 'Ativar prêmio'}
                          >
                            {premio.is_active ? (
                              <ToggleRight size={26} className="text-emerald-500" />
                            ) : (
                              <ToggleLeft size={26} className="text-slate-300" />
                            )}
                          </button>

                          <button
                            onClick={() => handleEditPremio(premio)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Editar fatia"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            onClick={() => handleDeletePremio(premio.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                            title="Remover fatia"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: VALIDAÇÃO DE CUPONS                                        */}
          {/* ================================================================= */}
          {activeTab === 'cupons' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Validação & Resgate de Cupons
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Busque pelo código do cupom (ex: ROL-XXXXXX) ou pelo WhatsApp do cliente para validar o resgate no balcão.
                </p>
              </div>

              {/* Search Bar & Filter Tabs */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={couponSearchQuery}
                    onChange={e => setCouponSearchQuery(e.target.value)}
                    placeholder="Buscar por código (ROL-...) ou WhatsApp..."
                    className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-400"
                  />
                  {isSearchingCoupons && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 animate-spin" size={16} />
                  )}
                  {couponSearchQuery && !isSearchingCoupons && (
                    <button
                      onClick={() => setCouponSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
                  {(['all', 'active', 'redeemed', 'expired'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setCouponFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                        couponFilter === f
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f === 'all' && 'Todos'}
                      {f === 'active' && 'Ativos'}
                      {f === 'redeemed' && 'Resgatados'}
                      {f === 'expired' && 'Expirados'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coupons List */}
              <div className="flex flex-col gap-3 mt-2">
                {filteredCoupons.length === 0 ? (
                  <div className="py-14 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-sm font-medium flex flex-col items-center gap-2">
                    <Ticket size={36} className="text-slate-300" />
                    <span>Nenhum cupom encontrado para esta busca ou filtro.</span>
                    <span className="text-xs text-slate-400">
                      Os cupons emitidos quando os clientes giram a roleta aparecerão aqui automaticamente.
                    </span>
                  </div>
                ) : (
                  filteredCoupons.map(coupon => {
                    const isExpired = coupon.status === 'expired' || new Date(coupon.expires_at) < new Date();
                    const isRedeemed = coupon.status === 'redeemed';
                    const isActive = coupon.status === 'active' && !isExpired;

                    return (
                      <div
                        key={coupon.id}
                        className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                      >
                        {/* Left: Voucher Code & Prize Info */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div
                            className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white font-black text-sm shadow-xs"
                            style={{ backgroundColor: coupon.premio?.color_hex || '#f43f5e' }}
                          >
                            <Ticket size={22} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base sm:text-lg font-black tracking-wider text-slate-900 font-mono select-all">
                                {coupon.code}
                              </span>

                              {/* Status Badge */}
                              {isActive && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                                  ● Ativo
                                </span>
                              )}
                              {isRedeemed && (
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider border border-slate-200">
                                  ✓ Resgatado
                                </span>
                              )}
                              {isExpired && !isRedeemed && (
                                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider border border-rose-200">
                                  ✕ Expirado
                                </span>
                              )}
                            </div>

                            <p className="text-sm font-bold text-slate-700 mt-0.5">
                              {coupon.premio?.title || 'Prêmio Promocional'}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Phone size={12} className="text-slate-400" />
                                {coupon.consumer_phone}
                                {coupon.consumer_name && ` (${coupon.consumer_name})`}
                              </span>

                              <span className="flex items-center gap-1">
                                <Calendar size={12} className="text-slate-400" />
                                Validade: {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                              </span>

                              {isRedeemed && coupon.redeemed_at && (
                                <span className="text-slate-400 text-[11px]">
                                  Resgatado em: {new Date(coupon.redeemed_at).toLocaleDateString('pt-BR')} às {new Date(coupon.redeemed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Action Button */}
                        <div className="shrink-0 w-full sm:w-auto flex items-center justify-end">
                          {isActive && (
                            <button
                              onClick={() => setConfirmRedeemCoupon(coupon)}
                              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
                            >
                              <Check size={14} className="stroke-[3]" />
                              <span>Validar & Resgatar</span>
                            </button>
                          )}

                          {isRedeemed && (
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                              <CheckCircle size={15} className="text-emerald-500" />
                              Já Utilizado
                            </span>
                          )}

                          {isExpired && !isRedeemed && (
                            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                              <AlertCircle size={15} />
                              Prazo Expirado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* ⚠️ CONFIRM REDEEM DIALOG MODAL                                    */}
      {/* ================================================================= */}
      {confirmRedeemCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h4 className="text-xl font-black text-slate-900 tracking-tight">
              Confirmar Resgate do Cupom?
            </h4>

            <p className="text-xs text-slate-500 font-medium mt-1">
              Confirme que o cliente está utilizando este benefício no estabelecimento.
            </p>

            {/* Coupon Summary Details Box */}
            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left flex flex-col gap-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Código:</span>
                <span className="font-black text-rose-600 font-mono text-sm">
                  {confirmRedeemCoupon.code}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Prêmio:</span>
                <span className="font-extrabold text-slate-800">
                  {confirmRedeemCoupon.premio?.title || 'Cupom'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Cliente:</span>
                <span className="font-extrabold text-slate-700">
                  {confirmRedeemCoupon.consumer_phone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmRedeemCoupon(null)}
                disabled={isPending}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={isPending}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} className="stroke-[3]" />
                    <span>Confirmar Resgate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

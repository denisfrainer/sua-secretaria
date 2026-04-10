'use client';

import React, { useEffect } from 'react';
import { TrendingUp, ArrowUpRight, ShoppingCart, CreditCard, RefreshCcw } from 'lucide-react';

const mockData = {
  totalRevenue: 894.00,
  currency: "R$",
  period: "Últimos 30 dias",
  recentRecoveries: [
    { id: 1, type: "Boleto Recuperado", product: "Mentoria Starter", amount: 297.00, time: "Há 2 horas", icon: RefreshCcw },
    { id: 2, type: "Venda Direta (PIX)", product: "E-book Setup", amount: 97.00, time: "Ontem", icon: CreditCard },
    { id: 3, type: "Abandono de Carrinho", product: "Curso Completo", amount: 500.00, time: "Há 3 dias", icon: ShoppingCart }
  ]
};

export const ElizaRoiCard = () => {
  useEffect(() => {
    console.log('[MOCK_RENDER] Displaying Eliza ROI Card with mock data for UI validation.');
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6 w-full max-w-md">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-900 font-bold text-lg leading-tight">Lucro Gerado pela IA</h3>
          <p className="text-gray-500 text-sm mt-0.5">Atribuição direta via conversas no WhatsApp</p>
        </div>
        <div className="bg-emerald-50 p-2 rounded-xl">
          <TrendingUp size={20} className="text-emerald-600" />
        </div>
      </div>

      {/* Main Value */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-emerald-500 font-black text-4xl tracking-tight">
            {mockData.currency} {mockData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full ml-2">
            <ArrowUpRight size={12} className="mr-0.5" />
            +12%
          </div>
        </div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
          {mockData.period}
        </p>
      </div>

      {/* List Analysis */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recuperações Recentes</span>
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">Proof of work</span>
        </div>
        
        <div className="space-y-3">
          {mockData.recentRecoveries.map((item) => (
            <div key={item.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{item.product}</p>
                  <p className="text-[11px] text-gray-400 font-medium">{item.type} • {item.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">
                  {mockData.currency} {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Action */}
      <button className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2">
        Ver Relatório Detalhado
      </button>
    </div>
  );
};

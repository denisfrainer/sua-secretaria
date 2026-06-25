'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  ArrowLeft,
  Filter,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const kpis = [
  {
    title: "Receita Gerada",
    value: "R$ 4.250,00",
    trend: "+12%",
    isPositive: true,
    icon: DollarSign,
  },
  {
    title: "Novos Agendamentos",
    value: "48",
    trend: "+5%",
    isPositive: true,
    icon: Calendar,
  },
  {
    title: "Ticket Médio",
    value: "R$ 88,50",
    trend: "-2%",
    isPositive: false,
    icon: Users,
  }
];

const topServices = [
  { name: "Mechas", percentage: 40, color: "bg-indigo-500" },
  { name: "Manicure", percentage: 35, color: "bg-emerald-500" },
  { name: "Sobrancelha", percentage: 25, color: "bg-amber-500" },
];

const transactions = [
  { id: 1, client: "Bruna Silva", service: "Mechas + Hidratação", status: "Concluído", amount: "R$ 450,00", initial: "B" },
  { id: 2, client: "Camila Rocha", service: "Manicure & Pedicure", status: "Confirmado", amount: "R$ 85,00", initial: "C" },
  { id: 3, client: "Juliana Costa", service: "Design de Sobrancelha", status: "Concluído", amount: "R$ 65,00", initial: "J" },
  { id: 4, client: "Fernanda Lima", service: "Corte & Escova", status: "Cancelado", amount: "R$ 120,00", initial: "F" },
  { id: 5, client: "Renata Souza", service: "Limpeza de Pele", status: "Confirmado", amount: "R$ 180,00", initial: "R" },
];

export default function ReportPage() {
  return (
    <div className="w-full min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-6 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard" className="p-2 shrink-0 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
              <ArrowLeft size={20} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">Performance da IA</h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium truncate">Relatório de conversão e receita</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex shrink-0 items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-600">
              <Calendar size={16} />
              Últimos 30 Dias
              <ChevronRight size={14} className="rotate-90 text-slate-400" />
            </div>
            <button className="p-2.5 shrink-0 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
              <Filter size={20} />
            </button>
            <button className="p-2.5 shrink-0 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-md shadow-slate-200">
              <Download size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpis.map((kpi, i) => (
            <motion.div 
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <kpi.icon size={20} className="text-slate-400" />
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  kpi.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {kpi.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpi.trend}
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.title}</p>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tighter">{kpi.value}</h2>
            </motion.div>
          ))}
        </div>

        {/* Charts & Secondary Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Revenue Chart Placeholder (2/3) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Evolução do Faturamento</h3>
                <p className="text-sm text-slate-400">Receita diária gerada pela IA</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Confirmado
                </span>
              </div>
            </div>

            {/* Mock Chart Area */}
            <div className="h-64 flex items-end justify-between gap-2 pt-4">
              {[40, 65, 45, 90, 75, 55, 85].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="w-full relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.5 + (i * 0.05), duration: 1, ease: "circOut" }}
                      className="w-full bg-slate-50 rounded-t-xl group-hover:bg-emerald-100 transition-colors relative"
                    >
                      {/* Inner accent bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </motion.div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-widest">
                    {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'][i]}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Services (1/3) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
          >
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-1">Top Serviços</h3>
            <p className="text-sm text-slate-400 mb-8">Distribuição por demanda</p>
            
            <div className="space-y-6">
              {topServices.map((service, i) => (
                <div key={service.name} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-700">{service.name}</span>
                    <span className="font-bold text-slate-400">{service.percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${service.percentage}%` }}
                      transition={{ delay: 0.8 + (i * 0.1), duration: 0.8 }}
                      className={`h-full ${service.color} rounded-full`}
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-500 italic leading-relaxed text-center">
                &quot;Mechas&quot; continua sendo o seu serviço de maior ticket médio.
              </p>
            </div>
          </motion.div>

        </div>

        {/* Transaction Table / Extrato */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Extrato Inteligente</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
              Processado em tempo real
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serviço</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all">
                          {tx.initial}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{tx.client}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                      {tx.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600' :
                        tx.status === 'Confirmado' ? 'bg-indigo-50 text-indigo-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900">
                      {tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 border-t border-slate-50 bg-slate-50/20 text-center">
            <button className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">
              Carregar mais transações
            </button>
          </div>
        </motion.div>

      </main>
    </div>
  );
}

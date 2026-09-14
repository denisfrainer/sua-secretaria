'use client';

import React from 'react';
import Link from 'next/link';
import { Dices, ShieldCheck, Heart, ArrowUp } from 'lucide-react';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-slate-800">
          
          {/* Brand Presentation (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                <Dices className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tight text-white">
                Roleta <span className="text-rose-400">Vantajosa</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              A plataforma definitiva de gamificação e fidelização de clientes para o comércio local. Transforme visitantes casuais em clientes recorrentes e apaixonados.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Conformidade com a LGPD e dados criptografados</span>
            </div>
          </div>

          {/* Navigation Column: Produto */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Produto
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#como-funciona" className="hover:text-rose-400 transition-colors">
                  Como Funciona
                </a>
              </li>
              <li>
                <a href="#planos" className="hover:text-rose-400 transition-colors">
                  Planos & Preços
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-rose-400 transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-rose-400 transition-colors">
                  Validador de Cupons
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column: Para Lojistas */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Área do Lojista
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-rose-400 transition-colors">
                  Entrar no Painel
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-rose-400 transition-colors">
                  Criar Nova Conta
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-rose-400 transition-colors">
                  Gerenciar Prêmios
                </Link>
              </li>
              <li>
                <a href="#planos" className="hover:text-rose-400 transition-colors">
                  Fazer Upgrade
                </a>
              </li>
            </ul>
          </div>

          {/* Navigation Column: Legal & Suporte */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Atendimento
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-rose-400 transition-colors">
                  Suporte via WhatsApp
                </Link>
              </li>
              <li>
                <span className="text-slate-500 cursor-not-allowed">
                  Termos de Serviço
                </span>
              </li>
              <li>
                <span className="text-slate-500 cursor-not-allowed">
                  Privacidade & Segurança
                </span>
              </li>
              <li>
                <span className="text-slate-500 cursor-not-allowed">
                  Status do Sistema: Operacional
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} Roleta Vantajosa. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Feito com <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> para o comércio local
            </span>
            <button
              onClick={scrollToTop}
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Voltar ao topo"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

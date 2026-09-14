'use client';

import React, { useState, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Sparkles,
  X,
  Trophy,
  MessageCircle,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { normalizePhone } from '@/lib/utils/phone';

export interface WheelSliceItem {
  id?: string;
  title: string;
  description?: string | null;
  color_hex: string;
  text_color_hex?: string;
  probability_weight?: number;
  is_losing_slice?: boolean;
}

export interface RouletteWheelProps {
  tenantId: string;
  storeName: string;
  whatsappPhone: string;
  premios?: WheelSliceItem[];
  primaryColor?: string;
  secondaryColor?: string;
}

const DEFAULT_SLICES: WheelSliceItem[] = [
  { title: '15% de Desconto', color_hex: '#f43f5e', text_color_hex: '#ffffff' },
  { title: 'Brinde Especial', color_hex: '#ec4899', text_color_hex: '#ffffff' },
  { title: 'Tente Novamente', color_hex: '#64748b', text_color_hex: '#ffffff', is_losing_slice: true },
  { title: '20% OFF na 2ª Compra', color_hex: '#8b5cf6', text_color_hex: '#ffffff' },
  { title: 'Frete / Entrega Grátis', color_hex: '#10b981', text_color_hex: '#ffffff' },
  { title: '5% OFF Imediato', color_hex: '#f59e0b', text_color_hex: '#ffffff' },
];

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  tenantId,
  storeName,
  whatsappPhone,
  premios = [],
  primaryColor = '#f43f5e',
  secondaryColor = '#fda4af'
}) => {
  const controls = useAnimation();
  const accumulatedRotation = useRef(0);

  // User input states
  const [userPhone, setUserPhone] = useState('');
  const [userName, setUserName] = useState('');

  // Flow & Animation states
  const [isSpinning, setIsSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result modals
  const [showWinModal, setShowWinModal] = useState(false);
  const [showCooldownModal, setShowCooldownModal] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string>('');
  const [wonPremio, setWonPremio] = useState<any>(null);
  const [wonCoupon, setWonCoupon] = useState<any>(null);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  // Active slices for the SVG wheel
  const wheelItems = premios && premios.length >= 2 ? premios : DEFAULT_SLICES;
  const numSlices = wheelItems.length;
  const sliceAngle = 360 / numSlices;

  // Phone input formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserPhone(e.target.value);
    if (errorMessage) setErrorMessage(null);
  };

  // ----------------------------------------------------
  // 🎰 SPIN TRIGGER & PHYSICS DECELERATION ENGINE
  // ----------------------------------------------------
  const handleSpinClick = async () => {
    if (isSpinning) return;
    setErrorMessage(null);

    // Strict Phone Normalization
    const normalized = normalizePhone(userPhone);
    if (!normalized || normalized.length < 10) {
      setErrorMessage('Por favor, informe seu WhatsApp com DDD (ex: 41 99999-9999).');
      return;
    }

    setIsSpinning(true);

    // 1. Immediately launch fast spinning loop while awaiting server response
    controls.start({
      rotate: accumulatedRotation.current + 3600,
      transition: {
        duration: 5,
        ease: 'linear',
      }
    });

    try {
      // 2. Query Server-Authoritative RPC
      const response = await fetch('/api/roulette/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_phone: normalized,
          consumer_name: userName.trim() || undefined
        }),
      });

      const data = await response.json();

      // 3. Handle Cooldown / Rate Limit (HTTP 429)
      if (response.status === 429 || data.error_code === 'COOLDOWN_ACTIVE') {
        controls.stop();
        setIsSpinning(false);
        setCooldownMessage(
          data.message || 'Você já girou a roleta hoje. Tente novamente mais tarde!'
        );
        setShowCooldownModal(true);
        return;
      }

      // 4. Handle Server Error
      if (!response.ok || !data.success) {
        controls.stop();
        setIsSpinning(false);
        setErrorMessage(data.message || 'Erro ao processar o sorteio. Tente novamente.');
        return;
      }

      // 5. Calculate Precise Landing Degrees on Winning Slice
      // Pointer is at 12 o'clock (top, 0deg in rotated coordinate system)
      const winningIndex = data.winning_index ?? 0;
      const sliceCenter = winningIndex * sliceAngle + sliceAngle / 2;
      const sliceOffset = (360 - sliceCenter) % 360;

      // Add 5 full rotations + exact offset from current base
      const nextBase = Math.ceil(accumulatedRotation.current / 360) * 360;
      const finalTargetRotation = nextBase + 360 * 5 + sliceOffset;
      accumulatedRotation.current = finalTargetRotation;

      // 6. Smooth Physics Deceleration Curve (Cubic-Bezier)
      await controls.start({
        rotate: finalTargetRotation,
        transition: {
          duration: 4.8,
          ease: [0.15, 0.9, 0.2, 1], // Realistic deceleration curve
        }
      });

      // 7. Animation Finished -> Open Celebration
      setIsSpinning(false);
      setWonPremio(data.premio);
      setWonCoupon(data.coupon || data.cupom);
      setShowWinModal(true);

    } catch (err: any) {
      console.error('❌ [ROULETTE_UI] Spin failure:', err);
      controls.stop();
      setIsSpinning(false);
      setErrorMessage('Falha de conexão com o servidor. Verifique sua internet.');
    }
  };

  // Copy Coupon Code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 2500);
  };

  // Format expiration date nicely
  const formatExpiration = (isoString?: string) => {
    if (!isoString) return '7 dias';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '7 dias';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Visual Roulette Wheel Container */}
      <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 mx-auto flex items-center justify-center select-none">
        
        {/* Pointer / Arrow at Top (12 o'clock) */}
        <div className="absolute -top-4 z-30 flex flex-col items-center filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div
            className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[28px]"
            style={{ borderTopColor: primaryColor }}
          />
          <div className="w-3.5 h-3.5 rounded-full -mt-2 shadow-inner" style={{ backgroundColor: primaryColor }} />
        </div>

        {/* Outer Glow Ring */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse -z-10"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Outer Border Rim with lights */}
        <div
          className="w-full h-full rounded-full p-2.5 shadow-2xl border-4 border-white/90 relative"
          style={{
            background: `radial-gradient(circle, #ffffff 60%, ${secondaryColor} 100%)`
          }}
        >
          {/* Rotating Wheel Frame */}
          <motion.div
            animate={controls}
            className="w-full h-full rounded-full shadow-inner overflow-hidden relative border-2 border-white"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {wheelItems.map((item, i) => {
                const startAngle = i * sliceAngle;
                const endAngle = (i + 1) * sliceAngle;

                // SVG Slice Path Geometry
                const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

                const largeArc = sliceAngle > 180 ? 1 : 0;
                const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
                const textAngle = startAngle + sliceAngle / 2;

                return (
                  <g key={i}>
                    {/* Slice Slice */}
                    <path
                      d={pathData}
                      fill={item.color_hex}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />

                    {/* Slice Text Label */}
                    <text
                      x="73"
                      y="50"
                      fill={item.text_color_hex || '#ffffff'}
                      fontSize={numSlices > 8 ? '2.8' : '3.6'}
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${textAngle}, 50, 50)`}
                      className="tracking-tight select-none font-sans"
                    >
                      {item.title.length > 18 ? item.title.slice(0, 16) + '…' : item.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </motion.div>

          {/* Center Peg Button / Icon */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-xl border-4 border-white flex items-center justify-center"
            style={{ borderColor: '#ffffff' }}
          >
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-inner"
              style={{ backgroundColor: primaryColor }}
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Input & Action Section */}
      <div className="w-full mt-8 flex flex-col gap-3 px-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>Seu WhatsApp para Receber o Cupom:</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              disabled={isSpinning}
              placeholder="(41) 99999-9999"
              value={userPhone}
              onChange={handlePhoneChange}
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-100/50 text-slate-800 placeholder-slate-400 text-base font-bold transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Spin CTA Button */}
        <button
          onClick={handleSpinClick}
          disabled={isSpinning}
          style={{
            background: isSpinning
              ? '#94a3b8'
              : `linear-gradient(135deg, ${primaryColor} 0%, #db2777 100%)`
          }}
          className="w-full text-white font-black py-4 px-6 rounded-2xl shadow-xl hover:shadow-rose-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          {isSpinning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sorteando seu Prêmio...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span>GIRAR A ROLETA AGORA</span>
              <ChevronRight className="w-5 h-5 stroke-[3]" />
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-400 text-center font-medium">
          🔒 Giro protegido por validação oficial de cupom e número de telefone.
        </p>
      </div>

      {/* ================================================================= */}
      {/* 🏆 WINNER CELEBRATION MODAL                                       */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showWinModal && wonPremio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-rose-100 text-center overflow-hidden"
            >
              {/* Confetti Ambient Top Accent */}
              <div
                className="absolute top-0 left-0 right-0 h-3"
                style={{ backgroundColor: wonPremio.color_hex || primaryColor }}
              />

              <button
                onClick={() => setShowWinModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white"
                style={{ backgroundColor: wonPremio.color_hex || primaryColor }}
              >
                <Trophy className="w-8 h-8 animate-bounce" />
              </div>

              {wonCoupon?.code ? (
                <>
                  <span className="inline-block bg-emerald-100 text-emerald-800 font-black text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider">
                    🎉 Parabéns! Você Ganhou!
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                    {wonPremio.title}
                  </h3>

                  {wonPremio.description && (
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {wonPremio.description}
                    </p>
                  )}

                  {/* Coupon Voucher Box */}
                  <div className="my-6 p-4 bg-slate-50 border-2 border-dashed border-rose-300 rounded-2xl relative">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      SEU CÓDIGO DE CUPOM EXCLUSIVO
                    </span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-2xl sm:text-3xl font-black tracking-widest text-rose-600 font-mono select-all">
                        {wonCoupon.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(wonCoupon.code)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Copiar código"
                      >
                        {hasCopiedCode ? (
                          <Check size={18} className="text-emerald-600" />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                    </div>
                    {hasCopiedCode && (
                      <span className="text-[10px] font-bold text-emerald-600 block mt-1">
                        Código copiado com sucesso!
                      </span>
                    )}

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-bold mt-2 pt-2 border-t border-slate-200/60">
                      <Clock size={13} className="text-slate-400" />
                      <span>Válido até: {formatExpiration(wonCoupon.expires_at)}</span>
                    </div>
                  </div>

                  {/* WhatsApp Direct CTA */}
                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
                      `Olá! Eu acabei de girar a roleta da sorte no espaço *${storeName}* e ganhei o prêmio: *${wonPremio.title}*!\n\n` +
                      `🎟️ *Meu Código de Cupom:* *${wonCoupon.code}*\n\n` +
                      `Gostaria de agendar / resgatar o meu presente!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg hover:shadow-emerald-200 transition-all text-sm uppercase tracking-wide cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Resgatar via WhatsApp</span>
                  </a>
                </>
              ) : (
                <>
                  <span className="inline-block bg-slate-100 text-slate-700 font-black text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider">
                    Não foi dessa vez
                  </span>

                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    {wonPremio.title}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                    Você tirou a fatia "{wonPremio.title}". Mas não desanime! O seu próximo giro estará liberado em 24 horas. Volte amanhã para tentar a sorte novamente!
                  </p>

                  <button
                    onClick={() => setShowWinModal(false)}
                    className="w-full mt-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Entendido, volto amanhã
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* ⏳ COOLDOWN ALERT MODAL (HTTP 429)                                 */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showCooldownModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-100 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Clock className="w-7 h-7" />
              </div>

              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                Giro Diário Já Realizado!
              </h4>

              <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                {cooldownMessage || 'Você já participou da rodada da sorte com este número de telefone hoje.'}
              </p>

              <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] font-bold text-amber-800 flex items-center justify-center gap-2">
                <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                <span>Limite de 1 giro por cliente a cada 24 horas.</span>
              </div>

              <button
                onClick={() => setShowCooldownModal(false)}
                className="w-full mt-6 py-3.5 bg-slate-900 hover:bg-black text-white font-black rounded-2xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Fechar e Voltar Amanhã
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

'use client';

import { useTranslations } from 'next-intl';
import { Zap, Shield, Globe } from 'lucide-react';

const icons = [Zap, Shield, Globe];

export function FeaturesSection() {
    const t = useTranslations('FeaturesSection');

    return (
        <section
            id="features"
            className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 border-t border-white/20"
        >
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4">
                {t('title')}
            </h2>
            <p className="text-center text-gray-400 text-lg mb-12 sm:mb-16 max-w-2xl mx-auto">
                {t('subtitle')}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {[1, 2, 3].map((i) => {
                    const Icon = icons[i - 1];
                    return (
                        <div
                            key={i}
                            className="bg-[var(--primary)] p-6 sm:p-8 rounded-2xl border border-white/20 transition-all duration-300 hover:border-[#00FF41]/50 hover:bg-[var(--secondary)]"
                        >
                            <div className="w-12 h-12 rounded-xl bg-[#00FF41]/10 flex items-center justify-center mb-5">
                                <Icon className="w-6 h-6 text-[#00FF41]" />
                            </div>
                            <h3 className="font-heading text-xl sm:text-2xl font-bold mb-3">
                                {t(`feature${i}Title`)}
                            </h3>
                            <p className="text-gray-400 text-base leading-relaxed">
                                {t(`feature${i}Description`)}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

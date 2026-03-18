"use client";

import { useEffect, useRef } from 'react';
// ❌ NENHUMA FONTE IMPORTADA AQUI. ZERO BYTES.

const PHRASES = [
    "Apenas R$499 por mês",
    "Cancele quando quiser",
    "Sem taxas ocultas",
    "Atendente 24h/7d"
];

const TYPING_SPEED = 70;
const ERASING_SPEED = 30;
const DELAY_BETWEEN = 2000;

export function AnimatedTerminal() {
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        let currentPhraseIndex = 0;
        let currentCharIndex = 0;
        let isErasing = false;
        let timeoutId: NodeJS.Timeout;

        const animateText = () => {
            const currentPhrase = PHRASES[currentPhraseIndex];
            if (!textRef.current) return;

            if (isErasing) {
                textRef.current.textContent = currentPhrase.substring(0, currentCharIndex - 1);
                currentCharIndex--;

                if (currentCharIndex === 0) {
                    isErasing = false;
                    currentPhraseIndex = (currentPhraseIndex + 1) % PHRASES.length;
                    timeoutId = setTimeout(animateText, 500);
                } else {
                    timeoutId = setTimeout(animateText, ERASING_SPEED);
                }
            } else {
                textRef.current.textContent = currentPhrase.substring(0, currentCharIndex + 1);
                currentCharIndex++;

                if (currentCharIndex === currentPhrase.length) {
                    isErasing = true;
                    timeoutId = setTimeout(animateText, DELAY_BETWEEN);
                } else {
                    timeoutId = setTimeout(animateText, TYPING_SPEED);
                }
            }
        };

        timeoutId = setTimeout(animateText, 500);
        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <div className="flex justify-center mt-2 h-8 text-center">
            {/* 👇 O Truque: font-['Courier_New',Courier,monospace] */}
            <p className="font-['Courier_New',Courier,monospace] font-bold text-2xl tracking-wider text-green-400 flex items-center">
                <span ref={textRef} className="mr-1"></span>
                {/* O Cursor Bloco "Gordinho" continua aqui */}
                <span className="inline-block w-[10px] h-[22px] bg-green-400 animate-blink-block"></span>
            </p>
        </div>
    );
}
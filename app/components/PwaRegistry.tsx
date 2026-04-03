'use client';
import { useEffect } from 'react';

export default function PwaRegistry() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(
          function (registration) {
            console.log('✅ [PWA] ServiceWorker registrado com sucesso. Scope:', registration.scope);
          },
          function (err) {
            console.error('❌ [PWA ERROR] Falha no registro do ServiceWorker:', err);
          }
        );
      });
    }
  }, []);

  return null; // This is a logic-only component
}

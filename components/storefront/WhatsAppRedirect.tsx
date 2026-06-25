'use client';

import { useCallback, useEffect } from 'react';

interface UseWhatsAppRedirectProps {
  componentName?: string;
}

export function formatWhatsAppLink(phone: string, text: string): string {
  // Normalize phone number (ensure only digits)
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function useWhatsAppRedirect(props?: UseWhatsAppRedirectProps) {
  useEffect(() => {
    console.log('[STOREFRONT_MOUNT] useWhatsAppRedirect mounted', { props });
  }, [props]);

  const redirectToWhatsApp = useCallback((phone: string, text: string, serviceName: string) => {
    const timestamp = new Date().toISOString();
    console.log('[STOREFRONT_ACTION] WhatsApp redirect triggered', {
      service: serviceName,
      phone,
      timestamp
    });

    const url = formatWhatsAppLink(phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return redirectToWhatsApp;
}

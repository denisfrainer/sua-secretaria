/*
  middleware.ts
  Middleware de i18n para SSG com next-intl
  CRÍTICO: Matcher excluindo todos os arquivos estáticos
*/

import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  // Todas as locales suportadas
  locales,

  // Locale padrão
  defaultLocale,

  // IMPORTANTE: Para SSG, usar 'as-needed' ou 'never'
  // 'as-needed' = adiciona prefix apenas para locales não-default
  localePrefix: 'as-needed',
});

export const config = {
  matcher: [
    /*
     * 🛡️ ESCUDO DO LOBO:
     * 1. Ignora internamente o que não deve ser traduzido (api, _next, favicon, etc)
     * 2. O comando (?!api) é o que impede o 308 Redirect no cron-job.
     */
    '/((?!api|_next/static|_next/image|admin|favicon.ico|images|certificates|.*\\..*).*)',

    // Mantém as rotas de idioma funcionando apenas para as páginas reais
    '/(pt|en|es)/:path*'
  ],
};

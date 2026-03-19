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
  // CRÍTICO para SSG: Matcher que IGNORA todos os arquivos estáticos
  // Sem isso, o build SSG falha ao tentar processar imagens, favicon, etc.
  matcher: [
    // Incluir todas as rotas EXCETO:
    '/((?!_next|api|admin|favicon.ico|images|certificates|.*\\..*|.*\\..*).*)',

    // Incluir rotas raiz
    '/',

    // Incluir rotas com locales
    '/(pt|en|es)/:path*'
  ]
};

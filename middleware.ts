import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export async function middleware(request: NextRequest) {
  // 1. Atualiza sessão do Supabase (lida com refresh de tokens)
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Path: ${pathname}, Logged: ${!!user}`);

  // 🛡️ Admin Protection
  if (pathname.startsWith('/admin')) {
    // 1. A exceção: Permite carregar a página de login (com ou sem barra no final)
    if (pathname.startsWith('/admin/login')) {
      // Se já estiver logado e tentar ir pro login, manda pro painel
      if (user) return NextResponse.redirect(new URL('/admin/config', request.url));
      // Se não estiver logado, libera o acesso para ele poder digitar a senha
      return response;
    }

    // 2. O Bloqueio: Qualquer outra rota dentro de /admin/ sem usuário logado toma block
    if (!user) {
      console.log(`[Middleware] BLOCKED: Unauthenticated access to ${pathname}.`);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return response;
  }

  // 🌐 i18n para outras rotas (não-admin)
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * 🛡️ ESCUDO DO LOBO ATUALIZADO:
     * 1. /admin/:path* explicitamente para proteção
     * 2. Exclui estáticos e api
     */
    '/admin/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|images|certificates|.*\\..*).*)',
    '/(pt|en|es)/:path*'
  ],
};


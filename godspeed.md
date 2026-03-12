# 🏎️ The Godspeed Manifesto: Defeating the Performance Balrog

**Target Confirmed:** 1.3s Speed Index | 99/100 Lighthouse | 0ms TBT
**Architecture:** Next.js 16 (App Router) + next-intl (SSG) + Tailwind v4

A magia dos 1.3s não está no código que escrevemos, mas no processamento que arrancamos do Next.js. Nós transformamos um framework dinâmico e pesado em uma ogiva nuclear estática. Se o Speed Index passar de 2.0s, uma destas 4 Leis foi quebrada.

## ⚖️ As 4 Leis do Padrão Ouro (1.3s)

### Lei 1: A Diretriz do "Servidor Desligado" (`output: 'export'`)
O Next.js quer otimizar imagens on-the-fly e o Netlify pune isso com Cold Starts de 4 segundos.
* **A Regra:** No `next.config.ts`, a união sagrada é `output: 'export'` e `images: { unoptimized: true }`.
* **O Efeito:** O Netlify vira um garçom burro e letal. Ele não processa nada, apenas cospe os arquivos `.avif` e `.html` que já estão prontos na CDN. TTFB (Time to First Byte) beira o zero.

### Lei 2: A Quarentena do Middleware (O Matcher Perfeito)
O `next-intl` intercepta rotas para verificar o idioma. Se ele interceptar imagens e fontes, a latência explode.
* **A Regra:** O matcher no `middleware.ts` DEVE conter o escudo de RegEx: 
  `'/((?!_next|api|favicon.ico|images|certificates|.*\\..*|.*\\..*).*)'`
* **O Efeito:** Imagens e assets passam direto pela "catraca" do i18n em velocidade máxima.

### Lei 3: O Pré-Cozimento de Rotas (`generateStaticParams`)
Tradução no Client-Side mata o First Contentful Paint.
* **A Regra:** A raiz `app/[locale]/page.tsx` DEVE ser um Server Component com `dynamic = 'force-static'` e usar `generateStaticParams`.
* **O Efeito:** Todo o HTML já nasce traduzido no momento do build. O navegador do usuário não precisa processar JavaScript para ler os textos da Hero.

### Lei 4: A Força Bruta do LCP e CSS Crítico
O navegador tem medo de pintar a tela antes de ler o CSS.
* **A Regra:** `optimizeCss: true` no Next Config. A imagem principal LCP DEVE carregar o motor de elite: `priority={true}`, `fetchPriority="high"`, `loading="eager"`, `decoding="sync"`. E NUNCA esquecer o `unoptimized={true}`.
* **O Efeito:** A imagem é baixada e socada na tela na mesma fração de segundo do HTML, sem engasgos.
export const RESERVED_SLUGS = [
  'login',
  'api',
  'admin',
  'auth',
  'dashboard',
  'settings',
  'assets',
  'public',
  's',
  'estudio',
  'registrar',
  'esqueci-a-senha',
  'termos',
  'privacidade',
  '_next',
  // Adicione outras rotas de sistema caso existam no futuro
];

/**
 * Valida se um slug é permitido (não é uma rota interna do sistema)
 */
export function isSlugReserved(slug: string): boolean {
  if (!slug) return true; // Empty string is not valid either
  return RESERVED_SLUGS.includes(slug.trim().toLowerCase());
}

/**
 * Normaliza uma string para se tornar um slug válido
 * Ex: "Estética Fulana da Silva" -> "estetica-fulana-da-silva"
 */
export function generateSlug(text: string): string {
  return text
    .normalize('NFD')                     // Separa os caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '')      // Remove os acentos
    .toLowerCase()                        // Transforma em minúscula
    .trim()                               // Remove espaços em branco
    .replace(/[^a-z0-9\s-]/g, '')       // Remove caracteres especiais
    .replace(/[\s-]+/g, '-');             // Troca espaços por hífens
}

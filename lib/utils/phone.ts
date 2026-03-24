export const normalizePhone = (phone: string): string => {
  if (!phone) return '';

  // Remove caracteres não numéricos e o sufixo do whatsapp
  let cleaned = phone.replace(/\D/g, '');

  // Garante o prefixo 55
  if (!cleaned.startsWith('55') && cleaned.length > 0) {
    cleaned = `55${cleaned}`;
  }

  // REGRA DE OURO: Se tiver 13 dígitos, remove o 9º dígito (posição 4 do index)
  if (cleaned.length === 13) {
    cleaned = cleaned.slice(0, 4) + cleaned.slice(5);
  }

  return cleaned;
};
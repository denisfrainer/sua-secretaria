// lib/utils/phone.ts

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, ''); // Remove non-digits
  
  // Brazil Logic: If it has 13 digits and starts with 55
  // Example: 55 48 9 9167... -> 55 48 9167...
  if (clean.startsWith('55') && clean.length === 13) {
    return clean.substring(0, 4) + clean.substring(5);
  }
  return clean;
}

// Utilitário para formatação de CEP
export function formatCepValue(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + '-' + digits.slice(5, 8);
}

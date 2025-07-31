// Utilitário para formatação de telefone
export function formatTelefoneValue(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  let result = '(' + digits.slice(0, 2) + ')';
  if (digits.length > 2) {
    result += digits.slice(2, 7);
  }
  if (digits.length > 7) {
    result += '-' + digits.slice(7, 11);
  }
  return result;
}

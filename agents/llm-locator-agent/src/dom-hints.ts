/** Mirrors SDK inferDomSearchFromHints for service-side agent (no page required). */
export function inferDomSearchFromHints(hints: string | undefined) {
  const h = (hints ?? '').toLowerCase();
  const input: { role?: string; tag?: string; textContains?: string } = {};

  if (/\b(button|click|submit|sign in|add to cart)\b/.test(h)) input.role = 'button';
  if (/\b(email|password|fill|input|textbox)\b/.test(h)) input.role = 'textbox';
  if (/\bemail\b/.test(h)) input.textContains = 'email';
  if (/\bpassword\b/.test(h)) input.textContains = 'password';
  if (/\bsign in\b/.test(h)) input.textContains = 'sign';
  if (/\badd to cart\b/.test(h)) input.textContains = 'cart';

  return input;
}

export interface Money {
  units: number;
  nanos: number;
  currency_code?: string;
}

export function centsFromMoney(m?: Money | null): number {
  if (!m) return 0;
  return m.units * 100 + Math.floor((m.nanos || 0) / 1e7);
}

export function moneyFromCents(cents: number, currency = 'USD'): Money {
  const sign = cents < 0 ? -1 : 1;
  const abs = Math.abs(cents);
  return {
    units: sign * Math.floor(abs / 100),
    nanos: sign * ((abs % 100) * 1e7),
    currency_code: currency,
  };
}

export function formatMoney(m?: Money | null): string {
  if (!m) return '$0.00';
  const sign = m.units < 0 || m.nanos < 0 ? '-' : '';
  const units = Math.abs(m.units);
  const nanos = Math.abs(m.nanos || 0);
  const cents = String(Math.floor(nanos / 1e7)).padStart(2, '0');
  return `${sign}$${units.toLocaleString('en-US')}.${cents}`;
}

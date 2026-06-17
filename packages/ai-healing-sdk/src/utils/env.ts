export function envTruthy(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export function envFalsy(value: string | undefined): boolean {
  return value === '0' || value === 'false';
}

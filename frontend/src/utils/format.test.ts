import { describe, expect, it } from 'vitest';

import { formatDate } from './format';

describe('formatDate', () => {
  it('devuelve "-" para valores nulos o indefinidos', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
  });

  it('formatea una fecha ISO (solo fecha) en espanol', () => {
    expect(formatDate('2024-03-15')).toBe('15 de marzo de 2024');
  });

  it('formatea una fecha ISO con hora en espanol', () => {
    expect(formatDate('2024-03-15T10:30:00')).toBe('15 de marzo de 2024');
  });

  it('devuelve el valor original si no es una fecha valida', () => {
    expect(formatDate('no-es-una-fecha')).toBe('no-es-una-fecha');
  });
});

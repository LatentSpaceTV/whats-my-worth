/**
 * Tax calculation utilities.
 */

import { BASIC_ALLOWANCE, ZONE_1_END, ZONE_2_END, RICH_TAX_START } from '../data/tax';

/**
 * Calculates German income tax (Einkommensteuer) based on current 2025 tax brackets.
 * Implements the progressive tax zones including basic allowance and top tax rates.
 * 
 * @param zve - Taxable income (Zu versteuerndes Einkommen) per year
 * @returns Annual income tax in Euros
 */
export function calculateTax(zve: number): number {
  const x = Math.floor(zve);

  let tax = 0;

  // Zone 1: tax free
  if (x <= BASIC_ALLOWANCE) {
    tax = 0;
  }

  // Zone 2: progressive 14% → ~24%
  else if (x <= ZONE_1_END) {
    const y = (x - BASIC_ALLOWANCE) / 10000;
    tax = (932.30 * y + 1400) * y;
  }

  // Zone 3: progressive ~24% → 42%
  else if (x <= ZONE_2_END) {
    const z = (x - ZONE_1_END) / 10000;
    tax = (176.64 * z + 2397) * z + 1015.13;
  }

  // Zone 4: 42%
  else if (x <= RICH_TAX_START) {
    tax = 0.42 * x - 10911.92;
  }

  // Zone 5: 45%
  else {
    tax = 0.45 * x - 19246.67;
  }

  return Math.max(0, Math.floor(tax));
}

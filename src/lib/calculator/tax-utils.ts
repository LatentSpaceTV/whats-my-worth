/**
 * Tax calculation utilities.
 */

export function calculateTax(zve: number): number {
  const x = Math.floor(zve);

  // 2025 values
  const basicAllowance = 12096; // Grundfreibetrag
  const zone1End = 17443;
  const zone2End = 68480;
  const richTaxStart = 277825;

  let tax = 0;

  // Zone 1: tax free
  if (x <= basicAllowance) {
    tax = 0;
  }

  // Zone 2: progressive 14% → ~24%
  else if (x <= zone1End) {
    const y = (x - basicAllowance) / 10000;
    tax = (932.30 * y + 1400) * y;
  }

  // Zone 3: progressive ~24% → 42%
  else if (x <= zone2End) {
    const z = (x - zone1End) / 10000;
    tax = (176.64 * z + 2397) * z + 1015.13;
  }

  // Zone 4: 42%
  else if (x <= richTaxStart) {
    tax = 0.42 * x - 10911.92;
  }

  // Zone 5: 45%
  else {
    tax = 0.45 * x - 19246.67;
  }

  return Math.max(0, Math.floor(tax));
}

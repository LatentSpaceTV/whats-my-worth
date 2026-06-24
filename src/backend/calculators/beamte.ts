/**
 * Beamte specific calculator logic.
 */
import { CalculationResult } from '../data/types';
import { HOMETOWN_MIETSTUFEN, MARRIED_BONUS } from '../data/beamte';
import { BESOLDUNG_TABLE, FAMILY_BONUS_TABLE } from '../data/beamte';
import { calculateTax } from './tax';

/**
 * Calculates the monthly family allowance (Familienzuschlag) for civil servants.
 * Accounts for marital status, number of children, and regional cost-of-living adjustments (Mietstufe).
 * 
 * @param children - Number of children
 * @param isMarried - Marital status
 * @param mietstufe - Regional Mietstufe (1-7)
 * @param entgeltgruppe - The Besoldung grade (e.g., 'A13')
 * @returns Monthly allowance in Euros
 */
export function getFamilienzuschlag(children: number, isMarried: boolean, mietstufe: number, entgeltgruppe: string): number {
  let total = 0;
  const group = entgeltgruppe.toUpperCase();
  
  // Married bonus
  if (isMarried) {
    if (['A5', 'A6'].includes(entgeltgruppe)) {
      total += MARRIED_BONUS['A5_A6'];
    }
    else if (['A7', 'A8'].includes(entgeltgruppe)) {
      total += MARRIED_BONUS['A7_A8'];
    }
    else {
      total += MARRIED_BONUS['OTHER'];
    }
  }

  // Determine the appropriate bonus table based on entgeltgruppe
  let bonusTable: Record<number, number[]>;
  if (['A5'].includes(group)) {
    bonusTable = FAMILY_BONUS_TABLE['A5'];
  } else if (['A6'].includes(group)) {
    bonusTable = FAMILY_BONUS_TABLE['A6'];
  } else if (['A7', 'A8'].includes(group)) {
    bonusTable = FAMILY_BONUS_TABLE['A7_A8'];
  } else {
    bonusTable = FAMILY_BONUS_TABLE['OTHER'];
  }
  
  const steps = bonusTable[mietstufe] || [];
  
  // Add child bonuses
  if (children >= 1 && steps.length > 0) total += steps[0];
  if (children >= 2 && steps.length > 1) total += steps[1];
  if (children >= 3 && steps.length > 2) total += steps[2];
  if (children >= 4 && steps.length > 3) total += steps[3];
  if (children > 4 && steps.length > 4) {
    total += steps[4] * (children - 4);
  }
  
  return total;
}

/**
 * Determines the entry-level salary step for a given Besoldung grade.
 * Grades like A5-A11 typically start at step 3, while higher grades start later.
 * 
 * @param group - Besoldung grade (e.g., 'A13')
 * @returns The starting step number
 */
export function getStartStep(group: string): number {
  const g = group.toUpperCase();
  if (['A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11'].includes(g)) return 3;
  if (g === 'A12') return 4;
  if (['A13', 'A14'].includes(g)) return 5;
  if (['A15', 'A16'].includes(g)) return 6;
  return 1;
}

/**
 * Retrieves the base monthly salary for a specific Besoldung grade and step.
 * 
 * @param group - Besoldung grade
 * @param step - Salary step
 * @returns Base monthly gross salary in Euros
 */
export function getBesoldung(group: string, step: number): number {
  const steps = BESOLDUNG_TABLE[group];
  if (!steps) return 0;
  const startStep = getStartStep(group);
  const index = step - startStep;
  return steps[Math.max(0, Math.min(index, steps.length - 1))] || 0;
}

/**
 * Performs a comprehensive net income calculation for a civil servant (Beamter).
 * Accounts for taxes, private insurance (PKV/PV) with Beihilfe subsidies, and family bonuses.
 * 
 * @param baseGross - Base salary before bonuses
 * @param pkvFullPremium - Total monthly premium for private health insurance (before Beihilfe)
 * @param location - Federal or state employer (e.g., 'Bund')
 * @param children - Number of children
 * @param hometown - Reference city for regional bonuses
 * @param isMarried - Marital status
 * @param group - Besoldung grade
 * @param customBonus - Additional user-defined monthly bonuses
 * @param pvFullPremium - Total monthly premium for private care insurance (before Beihilfe)
 * @returns Detailed calculation result including net and disposable income
 */
export function calculateBeamter(
  baseGross: number, 
  pkvAdultFull: number, 
  pkvKidFull: number,
  location: string = 'Bund', 
  children: number = 0, 
  hometown: string = 'Standard (Land)', 
  isMarried: boolean = true, 
  group: string = 'A13', 
  customBonus: number = 0,
  pvAdultFull: number = 0,
  pvKidFull: number = 0,
  beihilfeEnabled: boolean = true
): CalculationResult {
  // location is currently unused but kept for interface consistency
  const mietstufe = HOMETOWN_MIETSTUFEN[hometown] || 1;
  
  const familieBonus = getFamilienzuschlag(children, isMarried, mietstufe, group);
  const totalBonus = familieBonus + customBonus;
  
  const adjustedGross = baseGross + totalBonus;
  
  const adultBeihilfeRate = beihilfeEnabled ? (children >= 2 ? 0.7 : 0.5) : 0;
  const kidBeihilfeRate = beihilfeEnabled ? 0.8 : 0;

  const pkvReduced = (pkvAdultFull * (1 - adultBeihilfeRate)) + (children * pkvKidFull * (1 - kidBeihilfeRate));
  const pvReduced = (pvAdultFull * (1 - adultBeihilfeRate)) + (children * pvKidFull * (1 - kidBeihilfeRate));

  // Approximate taxable income: Gross - PKV deductible part
  // PHI basic cover is deductible. 
  const pkvPvDeductibleYearly = (pkvReduced + pvReduced) * 12;
  const taxableGrossYearly = (adjustedGross * 12) - pkvPvDeductibleYearly;
  const taxYearly = calculateTax(taxableGrossYearly);
  const taxMonthly = taxYearly / 12;

  const netBeforePkv = adjustedGross - taxMonthly;
  const disposable = netBeforePkv - pkvReduced - pvReduced;

  return {
    gross: adjustedGross,
    baseGross: baseGross,
    bonuses: {
      familie: familieBonus,
      ort: 0, 
      total: totalBonus,
    },
    net: netBeforePkv,
    tax: taxMonthly,
    taxableGross: taxableGrossYearly / 12,
    social: { 
      pensionInsurance: 0, 
      healthInsurance: 0, 
      careInsurance: 0, 
      unemploymentInsurance: 0, 
      total: 0 
    },
    pkv: pkvReduced,
    pkvPv: pvReduced,
    additionalCosts: { bu: 0, privatePension: 0, companyPension: 0, total: 0 },
    disposableIncome: disposable,
  };
}

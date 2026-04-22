/**
 * Beamte specific calculator logic.
 */
import { CalculationResult } from './types';
import { HOMETOWN_MIETSTUFEN } from './constants';
import { BESOLDUNG_TABLE, FAMILY_BONUS_TABLE } from './besoldung-data';
import { calculateTax } from './tax-utils';

export function getFamilienzuschlag(children: number, isMarried: boolean, mietstufe: number, entgeltgruppe: string): number {
  let total = 0;
  const group = entgeltgruppe.toUpperCase();
  
  // Married bonus
  const marriedBonus: Record<string, number> = {
    A5_A6: 164.64,
    A7_A8: 162.70,
    OTHER: 168.76,
  };

  if (isMarried) {
    if (['A5', 'A6'].includes(entgeltgruppe)) {
      total += marriedBonus['A5_A6'];
    }
    if (['A7', 'A8'].includes(entgeltgruppe)) {
      total += marriedBonus['A7_A8'];
    }
    else {
      total += marriedBonus['OTHER'];
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

export function getStartStep(group: string): number {
  const g = group.toUpperCase();
  if (['A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11'].includes(g)) return 3;
  if (g === 'A12') return 4;
  if (['A13', 'A14'].includes(g)) return 5;
  if (['A15', 'A16'].includes(g)) return 6;
  return 1;
}

export function getBesoldung(group: string, step: number): number {
  const steps = BESOLDUNG_TABLE[group];
  if (!steps) return 0;
  const startStep = getStartStep(group);
  const index = step - startStep;
  return steps[Math.max(0, Math.min(index, steps.length - 1))] || 0;
}

export function calculateBeamter(baseGross: number, pkvFullPremium: number, location: string = 'Bund', children: number = 0, hometown: string = 'Standard (Land)', isMarried: boolean = true, group: string = 'A13', customBonus: number = 0): CalculationResult {
  const mietstufe = HOMETOWN_MIETSTUFEN[hometown] || 1;
  
  const familieBonus = getFamilienzuschlag(children, isMarried, mietstufe, group);
  const totalBonus = familieBonus + customBonus;
  
  const adjustedGross = baseGross + totalBonus;
  
  const grossYearly = adjustedGross * 12;
  const taxYearly = calculateTax(grossYearly);
  const taxMonthly = taxYearly / 12;

  const beihilfeRate = children >= 2 ? 0.7 : 0.5;
  const pkvReduced = pkvFullPremium * (1 - beihilfeRate);

  const netBeforePkv = adjustedGross - taxMonthly;
  const disposable = netBeforePkv - pkvReduced;

  return {
    gross: adjustedGross,
    baseGross: baseGross,
    bonuses: {
      familie: familieBonus,
      ort: 0, // In this model, Ort is baked into Familienzuschlag
      total: totalBonus,
    },
    net: netBeforePkv,
    tax: taxMonthly,
    social: { 
      pensionInsurance: 0, 
      healthInsurance: 0, 
      careInsurance: 0, 
      unemploymentInsurance: 0, 
      total: 0 
    },
    pkv: pkvReduced,
    additionalCosts: { bu: 0, privatePension: 0, total: 0 },
    disposableIncome: disposable,
  };
}

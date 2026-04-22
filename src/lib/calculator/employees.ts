/**
 * Employee specific calculator logic.
 */
import { CalculationResult } from './types';
import { calculateTax } from './tax-utils';
import { ENTGELT_TABLE } from './constants';

export function calculateAngestellter(targetGrossMonthly: number, pkvFullPremium: number = 0, numberOfChildren: number = 0): CalculationResult {
  const grossYearly = targetGrossMonthly * 12;
  const taxYearly = calculateTax(grossYearly);
  const taxMonthly = taxYearly / 12;

  const kvRate = 0.073 + 0.008;
  let pvRate = 0.024;
  if (numberOfChildren > 0)
  {
    pvRate -= 0.06
  }
  const rvRate = 0.093;
  const avRate = 0.013;

  const kvLimit = 5175;
  const rvLimit = 7550;

  const rv = Math.min(targetGrossMonthly, rvLimit) * rvRate;
  const av = Math.min(targetGrossMonthly, rvLimit) * avRate;

  let kv = 0;
  let pv = 0;
  let employeePkvShare = 0;

  if (pkvFullPremium > 0) {
    // Employee is in PKV
    const agMaxKV = kvLimit * kvRate;
    const agMaxPV = kvLimit * pvRate;
    const agZuschuss = Math.min(pkvFullPremium / 2, agMaxKV + agMaxPV);
    employeePkvShare = pkvFullPremium - agZuschuss;
  } else {
    // Employee is in GKV
    kv = Math.min(targetGrossMonthly, kvLimit) * kvRate;
    pv = Math.min(targetGrossMonthly, kvLimit) * pvRate;
  }

  const totalSocial = kv + pv + rv + av;
  const netBeforePkv = targetGrossMonthly - taxMonthly - totalSocial;
  const disposable = netBeforePkv - employeePkvShare;

  return {
    gross: targetGrossMonthly,
    baseGross: targetGrossMonthly,
    bonuses: { familie: 0, ort: 0, total: 0 },
    net: netBeforePkv,
    tax: taxMonthly,
    social: { 
      pensionInsurance: rv, 
      healthInsurance: kv, 
      careInsurance: pv, 
      unemploymentInsurance: av, 
      total: totalSocial 
    },
    pkv: employeePkvShare,
    additionalCosts: { bu: 0, privatePension: 0, total: 0 },
    disposableIncome: disposable,
  };
}

export function findApproximateEntgelt(gross: number): string {
  let closest = 'E9a';
  let minDiff = Infinity;
  let change = Infinity;
  for (const [group, value] of Object.entries(ENTGELT_TABLE)) {
    const diff = Math.abs(gross - value);
    if (diff < minDiff) {
      minDiff = diff;
      change = gross / value;
      closest = group;
    }
  }
  return `${(change * 100).toFixed(1)}% von ${closest}`;
}

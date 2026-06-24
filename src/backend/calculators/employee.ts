/**
 * Employee specific calculator logic.
 */
import { CalculationResult } from '../data/types';
import { calculateTax } from './tax';
import { 
  KV_LIMIT_YEARLY, 
  V_PFLICHT_LIMIT_YEARLY, 
  TOTAL_KV_RATE, 
  EMPLOYER_PV_RATE, 
  RV_RATE, 
  AV_RATE, 
  RV_LIMIT 
} from '../data/employee';

/**
 * Calculates net income for regular employees (Angestellte).
 * Includes detailed social security breakdown (KV, PV, RV, AV) and income tax.
 * Handles both statutory (GKV) and private (PKV) health insurance logic.
 * 
 * @param targetGrossMonthly - Monthly gross salary
 * @param pkvFullPremium - Total PKV health premium (if applicable)
 * @param numberOfChildren - Number of children (affects PV rates)
 * @param companyPension - Monthly deduction for company pension scheme
 * @param pvFullPremium - Total PKV care premium (if applicable)
 * @returns Detailed calculation result
 */
export function calculateAngestellter(
  targetGrossMonthly: number, 
  pkvFullPremium: number = 0, 
  numberOfChildren: number = 0, 
  companyPension: number = 0,
  pvFullPremium: number = 0
): CalculationResult {
  const kvLimitMonthly = KV_LIMIT_YEARLY / 12;
  const employeeKvRate = TOTAL_KV_RATE / 2;
  
  let pvRate = numberOfChildren > 0 ? EMPLOYER_PV_RATE : 0.023; 

  const rv = Math.min(targetGrossMonthly, RV_LIMIT) * RV_RATE;
  const av = Math.min(targetGrossMonthly, RV_LIMIT) * AV_RATE;

  let kv = 0;
  let pv = 0;
  let employeePkvShare = 0;
  let employeePkvPvShare = 0;
  let agKvZuschuss = 0;
  let agPvZuschuss = 0;
  let actualPkvFull = 0;
  let actualPkvPvFull = 0;

  if ((pkvFullPremium > 0 || pvFullPremium > 0) && (targetGrossMonthly * 12) >= V_PFLICHT_LIMIT_YEARLY) {
    // Employee is in PKV (or voluntary GKV with subsidy, either way the formula is the same for the subsidy)
    actualPkvFull = pkvFullPremium;
    actualPkvPvFull = pvFullPremium;
    
    // Max subsidy is 8.5% for KV and 1.8% for PV of the Beitragsbemessungsgrenze
    const agMaxKV = kvLimitMonthly * employeeKvRate;
    const agMaxPV = kvLimitMonthly * EMPLOYER_PV_RATE; 
    
    agKvZuschuss = Math.min(pkvFullPremium / 2, agMaxKV);
    agPvZuschuss = Math.min(pvFullPremium / 2, agMaxPV);
    
    employeePkvShare = pkvFullPremium - agKvZuschuss;
    employeePkvPvShare = pvFullPremium - agPvZuschuss;
  } else {
    // Employee is in GKV
    const effectiveKvBasis = Math.min(targetGrossMonthly, kvLimitMonthly);
    
    kv = effectiveKvBasis * employeeKvRate;
    pv = effectiveKvBasis * pvRate;
  }

  const totalSocial = kv + pv + rv + av;

  // Approximate taxable income: Gross - Social Security
  // In reality, RV is ~96% deductible, KV/PV ~96%, AV not really. 
  // We use 90% as a safe average approximation for the deductible part of social insurance.
  const taxableGrossYearly = (targetGrossMonthly * 12) - (totalSocial * 12);
  const taxYearly = calculateTax(taxableGrossYearly);
  const taxMonthly = taxYearly / 12;

  // Net income includes the taxable gross minus taxes and social security, 
  // plus the tax-free employer subsidy for PKV if applicable.
  const agTotalZuschuss = agKvZuschuss + agPvZuschuss;
  const netIncome = targetGrossMonthly - taxMonthly - totalSocial + agTotalZuschuss;
  
  // Disposable income after all actual costs (taxes, social, pkv shares, baV)
  const disposableIncome = targetGrossMonthly - taxMonthly - totalSocial - employeePkvShare - employeePkvPvShare - companyPension;

  return {
    gross: targetGrossMonthly,
    baseGross: targetGrossMonthly,
    bonuses: { familie: 0, ort: 0, total: 0 },
    net: netIncome,
    tax: taxMonthly,
    taxableGross: taxableGrossYearly / 12,
    social: { 
      pensionInsurance: rv, 
      healthInsurance: kv, 
      careInsurance: pv, 
      unemploymentInsurance: av, 
      total: totalSocial 
    },
    pkv: employeePkvShare,
    pkvFull: actualPkvFull,
    pkvPv: employeePkvPvShare,
    pkvPvFull: actualPkvPvFull,
    agZuschuss: {
      kv: agKvZuschuss,
      pv: agPvZuschuss,
      total: agTotalZuschuss
    },
    additionalCosts: { bu: 0, privatePension: 0, companyPension: companyPension, total: companyPension },
    disposableIncome: disposableIncome,
  };
}

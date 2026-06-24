/**
 * Equivalence finder logic.
 */
import { CalculationResult, EquivalenceResult } from '../data/types';
import { calculateAngestellter } from '../calculators/employee';
import { getBenefitCosts } from '../calculators/pension';
import { calculateBeamter, getBesoldung } from '../calculators/beamte';
import { BESOLDUNG_TABLE } from '../data/beamte';

/**
 * Finds the equivalent gross salary for an employee that matches a civil servant's disposable income.
 * This is a core feature of the app, accounting for the different tax/social structures
 * and the additional costs employees face (e.g., larger pension gap, BU needs).
 * 
 * @param beamterResult - The result of a civil servant calculation to match
 * @param children - Number of children
 * @param pkvFullPremium - Full health insurance premium for employee comparison
 * @param etfRatePa - Expected annual return on private investments (%)
 * @param companyPension - Existing company pension monthly payment
 * @param pvFullPremium - Full care insurance premium for employee comparison
 * @returns The required employee gross and matching calculation details
 */
export function findEquivalence(
  beamterResult: CalculationResult,
  children: number,
  pkvAdultFull: number,
  pkvKidFull: number,
  etfRatePa: number = 6,
  companyPension: number = 0,
  pvAdultFull: number = 0,
  pvKidFull: number = 0
): EquivalenceResult {
  const targetDisposable = beamterResult.disposableIncome;

  const totalPkv = pkvAdultFull + (children * pkvKidFull);
  const totalPv = pvAdultFull + (children * pvKidFull);

  let currentGross = beamterResult.gross;
  let bestResult = calculateAngestellter(currentGross, totalPkv, children, companyPension, totalPv);
  let additionalCosts = getBenefitCosts(
    beamterResult.baseGross,
    currentGross,
    etfRatePa,
    40 // assume 40 years for equivalence match
  );
  
  for (let i = 0; i < 100; i++) {
    const privatePensionNeeded = Math.max(0, additionalCosts.pension - companyPension);
    const totalCosts = additionalCosts.bu + privatePensionNeeded;
    if (bestResult.disposableIncome - totalCosts >= targetDisposable) break;
    currentGross += 100;
    bestResult = calculateAngestellter(currentGross, totalPkv, children, companyPension, totalPv);
    additionalCosts = getBenefitCosts(
      beamterResult.baseGross,
      currentGross,
      etfRatePa,
      40
    );
  }

  for (let i = 0; i < 50; i++) {
    const privatePensionNeeded = Math.max(0, additionalCosts.pension - companyPension);
    const totalCosts = additionalCosts.bu + privatePensionNeeded;
    if (Math.abs((bestResult.disposableIncome - totalCosts) - targetDisposable) < 5) break;
    const diff = targetDisposable - (bestResult.disposableIncome - totalCosts);
    currentGross += diff * 1.8;
    bestResult = calculateAngestellter(currentGross, totalPkv, children, companyPension, totalPv);
    additionalCosts = getBenefitCosts(
      beamterResult.baseGross,
      currentGross,
      etfRatePa,
      40
    );
  }
  
  additionalCosts = getBenefitCosts(
    beamterResult.baseGross,
    currentGross,
    etfRatePa,
    40
  );

  const finalPrivatePensionNeeded = Math.max(0, additionalCosts.pension - companyPension);

  return {
    requiredGross: currentGross,
    result: {
      ...bestResult,
      additionalCosts: { 
        bu: additionalCosts.bu, 
        privatePension: finalPrivatePensionNeeded, 
        companyPension: companyPension,
        total: additionalCosts.bu + finalPrivatePensionNeeded + companyPension 
      },
      disposableIncome: bestResult.disposableIncome - additionalCosts.bu - finalPrivatePensionNeeded
    },
    benefitCost: { bu: additionalCosts.bu, pension: finalPrivatePensionNeeded }
  };
}

export type ReverseEquivalenceResult = {
  closestRank: { group: string; step: number };
  result: CalculationResult;
  employeeResult: CalculationResult;
};

/**
 * Finds the equivalent civil servant grade and step for a given employee gross salary.
 * Useful for employees considering a career switch to the public sector.
 * 
 * @param employeeGross - Current employee monthly gross salary
 * @param pkvFullPremium - Full health insurance premium
 * @param children - Number of children
 * @param isMarried - Marital status
 * @param location - Public employer (Bund/State)
 * @param hometown - Reference city
 * @param etfRatePa - Expected annual investment return (%)
 * @param customBonus - Additional bonuses
 * @param companyPension - Company pension monthly payment
 * @param pvFullPremium - Full care insurance premium
 * @returns The closest matching civil servant rank and calculation results
 */
export function findReverseEquivalence(
  employeeGross: number,
  pkvAdultFull: number,
  pkvKidFull: number,
  children: number,
  isMarried: boolean,
  location: string,
  hometown: string,
  etfRatePa: number = 6,
  customBonus: number = 0,
  companyPension: number = 0,
  pvAdultFull: number = 0,
  pvKidFull: number = 0
): ReverseEquivalenceResult {
  // 1. Calculate employee status
  const totalPkv = pkvAdultFull + (children * pkvKidFull);
  const totalPv = pvAdultFull + (children * pvKidFull);
  
  const baseEmployee = calculateAngestellter(employeeGross, totalPkv, children, companyPension, totalPv);
  // Calculate specific "match costs" for this gross
  const benefitCosts = getBenefitCosts(employeeGross * 0.7, employeeGross, etfRatePa, 40); 
  const privatePensionNeeded = Math.max(0, benefitCosts.pension - companyPension);
  const targetDisposable = baseEmployee.disposableIncome - benefitCosts.bu - privatePensionNeeded;

  let bestDiff = Infinity;
  let bestRank = { group: 'A13', step: 0 };
  let bestBeamterResult: CalculationResult | null = null;

  // Search through all Besoldung groups and steps
  for (const group of Object.keys(BESOLDUNG_TABLE)) {
    const steps = BESOLDUNG_TABLE[group];
    for (let i = 0; i < steps.length; i++) {
        const baseGross = steps[i];
        const bResult = calculateBeamter(baseGross, pkvAdultFull, pkvKidFull, location, children, hometown, isMarried, group, customBonus, pvAdultFull, pvKidFull);
        const diff = Math.abs(bResult.disposableIncome - targetDisposable);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestRank = { group, step: i };
            bestBeamterResult = bResult;
        }
    }
  }

  const finalPrivatePensionNeeded = Math.max(0, benefitCosts.pension - companyPension);

  return {
    closestRank: { group: bestRank.group, step: bestRank.step },
    result: bestBeamterResult!,
    employeeResult: {
        ...baseEmployee,
        additionalCosts: { 
          bu: benefitCosts.bu, 
          privatePension: finalPrivatePensionNeeded, 
          companyPension: companyPension,
          total: benefitCosts.bu + finalPrivatePensionNeeded + companyPension 
        },
        disposableIncome: targetDisposable
    }
  };
}

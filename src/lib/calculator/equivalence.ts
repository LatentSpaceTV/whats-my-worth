/**
 * Equivalence finder logic.
 */
import { CalculationResult, EquivalenceResult } from './types';
import { calculateAngestellter } from './employees';
import { getBenefitCosts } from './pension-utils';
import { calculateBeamter, getBesoldung } from './beamte';
import { BESOLDUNG_TABLE } from './besoldung-data';

export function findEquivalence(beamterResult: CalculationResult, children: number, pkvFullPremium: number, etfRatePa: number = 6): EquivalenceResult {
  const targetDisposable = beamterResult.disposableIncome;

  let currentGross = beamterResult.gross;
  let bestResult = calculateAngestellter(currentGross, pkvFullPremium, children);
  let additionalCosts = getBenefitCosts(
    beamterResult.baseGross,
    currentGross,
    etfRatePa
  );
  
  for (let i = 0; i < 100; i++) {
    const totalCosts = additionalCosts.bu + additionalCosts.pension;
    if (bestResult.disposableIncome - totalCosts >= targetDisposable) break;
    currentGross += 100;
    bestResult = calculateAngestellter(currentGross, pkvFullPremium, children);
    additionalCosts = getBenefitCosts(
      beamterResult.baseGross,
      currentGross,
      etfRatePa
    );
  }

  for (let i = 0; i < 50; i++) {
    const totalCosts = additionalCosts.bu + additionalCosts.pension;
    if (Math.abs((bestResult.disposableIncome - totalCosts) - targetDisposable) < 5) break;
    const diff = targetDisposable - (bestResult.disposableIncome - totalCosts);
    currentGross += diff * 1.8;
    bestResult = calculateAngestellter(currentGross, pkvFullPremium, children);
    additionalCosts = getBenefitCosts(
      beamterResult.baseGross,
      currentGross,
      etfRatePa
    );
  }
  
  additionalCosts = getBenefitCosts(
    beamterResult.baseGross,
    currentGross,
    etfRatePa
  );

  return {
    requiredGross: currentGross,
    result: {
      ...bestResult,
      additionalCosts: { bu: additionalCosts.bu, privatePension: additionalCosts.pension, total: additionalCosts.bu + additionalCosts.pension },
      disposableIncome: bestResult.disposableIncome - additionalCosts.bu - additionalCosts.pension
    },
    benefitCost: { bu: additionalCosts.bu, pension: additionalCosts.pension }
  };
}

export type ReverseEquivalenceResult = {
  closestRank: { group: string; step: number };
  result: CalculationResult;
  employeeResult: CalculationResult;
};

export function findReverseEquivalence(
  employeeGross: number,
  pkvFullPremium: number,
  children: number,
  isMarried: boolean,
  location: string,
  hometown: string,
  etfRatePa: number = 6,
  customBonus: number = 0
): ReverseEquivalenceResult {
  // 1. Calculate employee status
  const baseEmployee = calculateAngestellter(employeeGross, pkvFullPremium, children);
  // Calculate specific "match costs" for this gross
  const benefitCosts = getBenefitCosts(employeeGross * 0.7, employeeGross, etfRatePa); // Using a ballpark for pension target
  const targetDisposable = baseEmployee.disposableIncome - benefitCosts.bu - benefitCosts.pension;

  let bestDiff = Infinity;
  let bestRank = { group: 'A13', step: 0 };
  let bestBeamterResult: CalculationResult | null = null;

  // Search through all Besoldung groups and steps
  for (const group of Object.keys(BESOLDUNG_TABLE)) {
    const steps = BESOLDUNG_TABLE[group];
    // Each index in the data table matches a real world step.
    for (let i = 0; i < steps.length; i++) {
        const baseGross = steps[i];
        const bResult = calculateBeamter(baseGross, pkvFullPremium, location, children, hometown, isMarried, group, customBonus);
        const diff = Math.abs(bResult.disposableIncome - targetDisposable);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestRank = { group, step: i }; // Store index i
            bestBeamterResult = bResult;
        }
    }
  }

  return {
    closestRank: { group: bestRank.group, step: bestRank.step },
    result: bestBeamterResult!,
    employeeResult: {
        ...baseEmployee,
        additionalCosts: { bu: benefitCosts.bu, privatePension: benefitCosts.pension, total: benefitCosts.bu + benefitCosts.pension },
        disposableIncome: targetDisposable
    }
  };
}

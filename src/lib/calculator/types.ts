/**
 * German Salary Calculator Types.
 */

export interface CalculationResult {
  gross: number;
  baseGross: number;
  bonuses: {
    familie: number;
    ort: number;
    total: number;
  };
  net: number;
  tax: number;
  social: {
    pensionInsurance: number;
    healthInsurance: number;
    careInsurance: number;
    unemploymentInsurance: number;
    total: number;
  };
  pkv?: number;
  additionalCosts: {
    bu: number;
    privatePension: number;
    total: number;
  };
  disposableIncome: number; // net - pkv - additionalCosts
}

export type RetirementMatchResult = {
  bu: number;
  pension: number;
  beamterPensionTarget: number;
  estimatedGesetzlicheRente: number;
  pensionGap: number;
};

export type EquivalenceResult = {
  requiredGross: number;
  result: CalculationResult;
  benefitCost: { bu: number; pension: number };
};

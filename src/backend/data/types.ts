/**
 * German Salary Calculator Types.
 */

/**
 * The unified result structure for all salary calculations.
 * Used to display detailed breakdowns of gross, net, taxes, and social security.
 */
export interface CalculationResult {
  gross: number; // Total monthly gross including bonuses
  baseGross: number; // Base salary before family/regional bonuses
  bonuses: {
    familie: number;
    ort: number;
    total: number;
  };
  net: number; // Net income before private insurance or special costs
  tax: number; // Monthly income tax
  taxableGross: number; // Monthly taxable income after deductions
  social: {
    pensionInsurance: number;
    healthInsurance: number;
    careInsurance: number;
    unemploymentInsurance: number;
    total: number;
  };
  pkv?: number; // Monthly health insurance cost (private or add-on) - Employee Share
  pkvFull?: number; // Total health insurance premium
  pkvPv?: number; // Monthly care insurance cost (private or add-on) - Employee Share
  pkvPvFull?: number; // Total care insurance premium
  agZuschuss?: {
    kv: number;
    pv: number;
    total: number;
  };
  additionalCosts: {
    bu: number; // Occupational disability insurance
    privatePension: number; // Necessary private pension savings
    companyPension: number; // Employee's bAV contribution
    total: number;
  };
  disposableIncome: number; // Final income available for general spending (Net - PKV - Supplemental costs)
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

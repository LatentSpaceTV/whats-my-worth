/**
 * Retirement and insurance match utilities.
 */
import { RetirementMatchResult } from './types';

export function calculateRetirementMatchCosts(
  beamterBaseGross: number,
  employeeGross: number,
  etfRatePa: number = 6
): RetirementMatchResult {
  const beamterPensionTarget = beamterBaseGross * 0.7175;

  /**
   * -----------------------------
   * 2. Employee gesetzliche Rente
   * -----------------------------
   */
  const contributionCeiling = 73500;
  const monthlyContributionCeiling = contributionCeiling / 12;
  
  const cappedGross = Math.min(employeeGross, monthlyContributionCeiling);
  const estimatedGesetzlicheRente = cappedGross * 0.48;

  /**
   * -----------------------------
   * 3. Pension gap
   * -----------------------------
   */
  const pensionGap = Math.max(0, beamterPensionTarget - estimatedGesetzlicheRente);

  /**
   * -----------------------------
   * 4. ETF Depot Calculation
   * -----------------------------
   * We calculate the monthly savings rate needed to bridge the gap
   * assuming 35 years of investment and a 4% safe withdrawal rate.
   */
  const years = 35;
  const swr = 0.04;
  const targetCapital = (pensionGap * 12) / swr;
  
  let monthlyContribution = 0;
  const r = etfRatePa / 100;
  
  if (r > 0) {
    const monthlyRate = r / 12;
    const months = years * 12;
    monthlyContribution = (targetCapital * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
  } else {
    monthlyContribution = targetCapital / (years * 12);
  }

  /**
   * -----------------------------
   * 5. BU insurance cost
   * -----------------------------
   */
  const bu = employeeGross * 0.022;

  return {
    bu: Math.round(bu),
    pension: Math.round(monthlyContribution),
    beamterPensionTarget: Math.round(beamterPensionTarget),
    estimatedGesetzlicheRente: Math.round(estimatedGesetzlicheRente),
    pensionGap: Math.round(pensionGap),
  };
}

export const getBenefitCosts = (
  beamterBaseGross: number,
  employeeGross: number,
  etfRatePa: number = 6
) => {
  return calculateRetirementMatchCosts(
    beamterBaseGross,
    employeeGross,
    etfRatePa
  );
};

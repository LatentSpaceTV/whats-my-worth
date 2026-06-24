/**
 * Retirement and insurance match utilities.
 */
import { RetirementMatchResult } from '../data/types';
import { calculateTax } from './tax';
import { 
  MAX_PENSION_RATE, 
  BBG_RV_WEST_2025, 
  AVERAGE_SALARY_2025, 
  RENTENWERT_2025, 
  SWR, 
  BU_RATE 
} from '../data/retirement';

/**
 * Calculates the monthly costs an employee must bear to achieve a similar 
 * financial security level at retirement as a civil servant.
 * 
 * Includes:
 * 1. Pension Gap: The difference between expected Net Beamtenpension and Net Gesetzliche Rente.
 * 2. Savings Rate: Monthly ETF investment needed to bridge the pension gap over 40 years.
 * 3. BU (Berufsunfähigkeit): Estimated cost for occupational disability insurance.
 * 
 * @param beamterBaseGross - The base salary of the Beamter to compare against
 * @param employeeGross - The current gross salary of the employee
 * @param etfRatePa - Expected annual return on private investments (%)
 * @param years - Investment duration (defaults to 40)
 * @returns Breakdown of insurance and retirement matching costs
 */
export function calculateRetirementMatchCosts(
  beamterBaseGross: number,
  employeeGross: number,
  etfRatePa: number = 6,
  years: number = 40
): RetirementMatchResult {
  // 1. Net Beamter Pension
  const beamterGrossPension = beamterBaseGross * MAX_PENSION_RATE;
  const beamterTax = calculateTax(beamterGrossPension * 12) / 12;
  const netBeamterPension = beamterGrossPension - beamterTax;

  // 2. Net Statutory Pension (Estimation based on current salary)
  const averageSalaryMonthly = AVERAGE_SALARY_2025 / 12;
  
  const cappedGross = Math.min(employeeGross, BBG_RV_WEST_2025);
  const estimatedGrossRente = (cappedGross / averageSalaryMonthly) * years * RENTENWERT_2025;
  const renteTax = calculateTax(estimatedGrossRente * 12) / 12;
  const netGesetzlicheRente = estimatedGrossRente - renteTax;

  // 3. Pension gap (Net vs Net)
  const pensionGap = Math.max(0, netBeamterPension - netGesetzlicheRente);

  // 4. ETF Depot Calculation
  // We calculate the monthly savings rate needed to bridge the gap
  // assuming 'years' of investment and a 4% safe withdrawal rate (SWR).
  // We account for 25% capital gains tax on the withdrawal profits.
  // Effective gap target = Gap / (1 - TaxRate)
  const taxRate = 0.25;
  const adjustedPensionGap = pensionGap / (1 - taxRate);
  const targetCapital = (adjustedPensionGap * 12) / SWR;
  
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
  const bu = employeeGross * BU_RATE;

  return {
    bu: Math.round(bu),
    pension: Math.round(monthlyContribution),
    beamterPensionTarget: Math.round(netBeamterPension),
    estimatedGesetzlicheRente: Math.round(netGesetzlicheRente),
    pensionGap: Math.round(pensionGap),
  };
}

export const getBenefitCosts = (
  beamterBaseGross: number,
  employeeGross: number,
  etfRatePa: number = 6,
  years: number = 40
) => {
  return calculateRetirementMatchCosts(
    beamterBaseGross,
    employeeGross,
    etfRatePa,
    years
  );
};

import { BESOLDUNG_TABLE } from '../data/beamte';
import { ENTGELT_TABLE } from '../data/employee';
import { calculateBeamter, getBesoldung, getStartStep } from '../calculators/beamte';
import { calculateAngestellter } from '../calculators/employee';
import { getBenefitCosts } from '../calculators/pension';
import { calculateTax } from '../calculators/tax';

export interface CareerYear {
  year: number;
  beamterDisposable: number;
  employeeDisposable: number;
  beamterCumulative: number;
  employeeCumulative: number;
}

export interface RetirementProjection {
  beamterMonthly: number;
  employeeMonthlyGesetzlich: number;
  employeeMonthlyPrivate: number; // From ETF
  employeeTotalMonthly: number;
  employeeCapital: number;
}

export interface CareerPathResult {
  path: CareerYear[];
  retirement: RetirementProjection;
}

const BEAMTE_STEP_DURATIONS = [2, 2, 2, 3, 3, 3, 4, 4, 4, 4];
const EMPLOYEE_STEP_DURATIONS = [1, 2, 3, 4, 5, 5, 5, 5, 5];

const DURCHSCHNITTSENTGELT_2025 = 50493;
const RENTENWERT_2024 = 39.32;
const MAX_RV_GROSS_MONTHLY = 8050; 

/**
 * Project a 40-year career path comparing Beamte vs. Employees.
 * Accounts for automatic step increases (Stufenaufstieg) and calculates cumulative earnings.
 * 
 * @returns A result object containing income metrics for both paths and retirement projection
 */
export function calculateCareerPath(
  startBesoldungGroup: string,
  startBesoldungStep: number,
  startEntgeltGroup: string,
  pkvAdultHealth: number,
  pkvKidHealth: number,
  location: string,
  children: number,
  hometown: string,
  isMarried: boolean,
  etfRate: number,
  customBonus: number,
  companyPension: number,
  years: number = 40,
  pkvAdultCare: number = 0,
  pkvKidCare: number = 0,
  beihilfeEnabled: boolean = true
): CareerPathResult {
  const path: CareerYear[] = [];
  
  let currentBesoldungStep = startBesoldungStep;
  let yearsInCurrentBesoldungStep = 0;
  
  let currentEntgeltStep = 1; // Always start at the lowest step
  let yearsInCurrentEntgeltStep = 0;
  
  let beamterCumulative = 0;
  let employeeCumulative = 0;

  // Track retirement variables
  let lastBeamterBaseGross = 0;
  let lastEmployeeGross = 0;
  let accumulatedEtfCapital = 0;
  let accumulatedRentenpunkte = 0;
  const monthlyRate = (etfRate / 100) / 12;

  for (let y = 0; y < years; y++) {
    // Kids only count for the first 25 years
    const activeChildren = y < 25 ? children : 0;
    
    const baseGross = getBesoldung(startBesoldungGroup, currentBesoldungStep);
    lastBeamterBaseGross = baseGross;

    // Use dynamic calculation if Beihilfe is disabled (voluntary GKV)
    let yearPkvAdultHealth = pkvAdultHealth;
    let yearPkvKidHealth = pkvKidHealth;
    let yearPkvAdultCare = pkvAdultCare;
    let yearPkvKidCare = pkvKidCare;

    if (!beihilfeEnabled) {
      const BBG_2025 = 5512.50;
      const cappedGross = Math.min(baseGross, BBG_2025);
      yearPkvAdultHealth = cappedGross * 0.175;
      yearPkvAdultCare = cappedGross * (activeChildren > 0 ? 0.036 : 0.042);
      yearPkvKidHealth = 0;
      yearPkvKidCare = 0;
    }

    const currentPkvHealth = yearPkvAdultHealth + (activeChildren * yearPkvKidHealth);
    const currentPkvCare = yearPkvAdultCare + (activeChildren * yearPkvKidCare);

    const beamterCalc = calculateBeamter(
      baseGross, 
      yearPkvAdultHealth,
      yearPkvKidHealth,
      location, 
      activeChildren, 
      hometown, 
      isMarried, 
      startBesoldungGroup, 
      customBonus, 
      yearPkvAdultCare,
      yearPkvKidCare,
      beihilfeEnabled
    );
    
    const steps = ENTGELT_TABLE[startEntgeltGroup];
    const employeeBaseGross = steps ? (steps[currentEntgeltStep] || steps[Object.keys(steps).length]) : 0;
    lastEmployeeGross = employeeBaseGross;

    // Track Rentenpunkte
    const effectiveRvGross = Math.min(employeeBaseGross, MAX_RV_GROSS_MONTHLY);
    accumulatedRentenpunkte += (effectiveRvGross * 12) / DURCHSCHNITTSENTGELT_2025;

    // Calculate how much should be saved to match Beamter pension
    const benefitCosts = getBenefitCosts(baseGross, employeeBaseGross, etfRate, years);
    const totalPrivatePensionNeeded = Math.max(0, benefitCosts.pension - companyPension);
    
    const employeeCalc = calculateAngestellter(
      employeeBaseGross, 
      currentPkvHealth, 
      activeChildren, 
      companyPension, 
      currentPkvCare
    );
    
    // Disposable income calculation for comparison
    const employeeDisposable = employeeCalc.disposableIncome - totalPrivatePensionNeeded;

    // ETF growth
    for (let m = 0; m < 12; m++) {
      accumulatedEtfCapital = accumulatedEtfCapital * (1 + monthlyRate) + totalPrivatePensionNeeded;
    }

    beamterCumulative += beamterCalc.disposableIncome * 12;
    employeeCumulative += employeeDisposable * 12;

    path.push({
      year: y + 1,
      beamterDisposable: beamterCalc.disposableIncome,
      employeeDisposable: employeeDisposable,
      beamterCumulative,
      employeeCumulative
    });

    // Progression logic
    yearsInCurrentBesoldungStep++;
    const bSteps = BESOLDUNG_TABLE[startBesoldungGroup] || [];
    const bStart = getStartStep(startBesoldungGroup);
    const bMaxStep = bStart + bSteps.length - 1;
    
    if (currentBesoldungStep < bMaxStep) {
      const bDuration = BEAMTE_STEP_DURATIONS[currentBesoldungStep - bStart] || 4;
      if (yearsInCurrentBesoldungStep >= bDuration) {
        currentBesoldungStep++;
        yearsInCurrentBesoldungStep = 0;
      }
    }

    yearsInCurrentEntgeltStep++;
    if (currentEntgeltStep < 6) {
      const eDuration = EMPLOYEE_STEP_DURATIONS[currentEntgeltStep - 1] || 5;
      if (yearsInCurrentEntgeltStep >= eDuration) {
        currentEntgeltStep++;
        yearsInCurrentEntgeltStep = 0;
      }
    }
  }

  // Final Retirement Projection
  // Beamter: 71.75% of last base gross, fully taxed
  const beamterGrossPension = lastBeamterBaseGross * 0.7175;
  const beamterTax = calculateTax(beamterGrossPension * 12) / 12;
  const beamterNetMonthly = beamterGrossPension - beamterTax;
  
  // Employee: Exact Rentenpunkte calculation
  const employeeGrossMonthlyGesetzlich = accumulatedRentenpunkte * RENTENWERT_2024;
  const employeeTax = calculateTax(employeeGrossMonthlyGesetzlich * 12) / 12;
  const employeeNetMonthlyGesetzlich = employeeGrossMonthlyGesetzlich - employeeTax;
  
  const swr = 0.04; // 4% safe withdrawal rate
  const taxRate = 0.25; // 25% capital gains tax
  const employeeMonthlyPrivate = ((accumulatedEtfCapital * swr) / 12) * (1 - taxRate);

  return {
    path,
    retirement: {
      beamterMonthly: Math.round(beamterNetMonthly),
      employeeMonthlyGesetzlich: Math.round(employeeNetMonthlyGesetzlich),
      employeeMonthlyPrivate: Math.round(employeeMonthlyPrivate),
      employeeTotalMonthly: Math.round(employeeNetMonthlyGesetzlich + employeeMonthlyPrivate),
      employeeCapital: Math.round(accumulatedEtfCapital)
    }
  };
}

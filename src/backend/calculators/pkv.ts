/**
 * Private Health Insurance (PKV) calculation logic.
 */
import { PKV_PLAN_COSTS } from '../data/pkv';

export const calculatePKVBreakdown = (
  plan: string,
  children: number,
  custom: { adultPkv: number; adultPflege: number; kidPkv: number; kidPflege: number },
  gross?: number
) => {
  const isGkv = plan === 'voluntaryGkv';
  const adultBeihilfeRate = isGkv ? 0 : (children >= 2 ? 0.7 : 0.5);
  const kidBeihilfeRate = isGkv ? 0 : 0.8; // Children usually have 80% Beihilfe

  let adultPkv = 0;
  let adultPflege = 0;
  let kidPkvTotal = 0;
  let kidPflegeTotal = 0;

  if (plan === 'voluntaryGkv') {
    const BBG_2025 = 5512.50;
    const cappedGross = Math.min(gross || 5000, BBG_2025);
    adultPkv = cappedGross * 0.175; // 17.5% as requested
    adultPflege = cappedGross * (children > 0 ? 0.036 : 0.042); // 3.6% or 4.2% as requested
    // Kids are free in GKV (familienversichert)
    kidPkvTotal = 0;
    kidPflegeTotal = 0;
  } else if (plan === 'individual') {
    adultPkv = custom.adultPkv;
    adultPflege = custom.adultPflege;
    kidPkvTotal = children * custom.kidPkv;
    kidPflegeTotal = children * custom.kidPflege;
  } else {
    const costs = PKV_PLAN_COSTS[plan as keyof typeof PKV_PLAN_COSTS] || PKV_PLAN_COSTS.standard;
    adultPkv = costs.adult_pkv;
    adultPflege = costs.adult_pflege;
    kidPkvTotal = children * costs.kid_pkv;
    kidPflegeTotal = children * costs.kid_pflege;
  }

  const adultPkvReduced = adultPkv * (1 - adultBeihilfeRate);
  const adultPflegeReduced = adultPflege * (1 - adultBeihilfeRate);
  const kidPkvReducedTotal = kidPkvTotal * (1 - kidBeihilfeRate);
  const kidPflegeReducedTotal = kidPflegeTotal * (1 - kidBeihilfeRate);
  
  // Estimation of state contribution
  const adultBeihilfeEst = (adultPkv + adultPflege) * adultBeihilfeRate;
  const kidBeihilfeEst = (kidPkvTotal + kidPflegeTotal) * kidBeihilfeRate;

  return {
    adultPkv,
    adultPflege,
    kidPkvTotal,
    kidPflegeTotal,
    adultPkvReduced,
    adultPflegeReduced,
    kidPkvReducedTotal,
    kidPflegeReducedTotal,
    total: adultPkv + adultPflege + kidPkvTotal + kidPflegeTotal,
    totalReduced: adultPkvReduced + adultPflegeReduced + kidPkvReducedTotal + kidPflegeReducedTotal,
    adultBeihilfeRate,
    kidBeihilfeRate,
    beihilfeTotalEst: adultBeihilfeEst + kidBeihilfeEst
  };
};

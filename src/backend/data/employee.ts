/**
 * Employee specific data tables and utilities.
 */

// Entgeltsgruppen / Stufen
export const ENTGELT_TABLE: Record<string, Record<number, number>> = {
  'E 15Ü': {
    1: 7043.03,
    2: 7801.34,
    3: 8504.80,
    4: 8971.62,
    5: 9086.46,
  },
  'E 15': {
    1: 5811.77,
    2: 6231.77,
    3: 6453.71,
    4: 7242.03,
    5: 7838.96,
    6: 8067.44,
  },
  'E 14': {
    1: 5283.02,
    2: 5665.43,
    3: 5979.22,
    4: 6453.71,
    5: 7180.75,
    6: 7389.51,
  },
  'E 13': {
    1: 4943.68,
    2: 5303.82,
    3: 5574.72,
    4: 6101.01,
    5: 6828.55,
    6: 7026.65,
  },
  'E 12': {
    1: 4477.84,
    2: 4777.52,
    3: 5412.18,
    4: 5969.45,
    5: 6689.23,
    6: 6883.15,
  },
  'E 11': {
    1: 4437.23,
    2: 4719.42,
    3: 5042.63,
    4: 5533.24,
    5: 6245.40,
    6: 6425.86,
  },
  'E 10': {
    1: 4288.63,
    2: 4566.37,
    3: 4884.38,
    4: 5208.79,
    5: 5826.04,
    6: 5993.91,
  },
  'E 9b': {
    1: 3844.40,
    2: 4110.64,
    3: 4285.08,
    4: 4767.12,
    5: 5177.15,
    6: 5325.58,
  },
};

/**
 * Finds the closest Entgeltgruppe and Stufe for a given target gross salary.
 */
export function findApproximateEntgelt(monthlyGross: number): string {
    let closestKey = "";
    let closestDiff = Infinity;

    for (const group of Object.keys(ENTGELT_TABLE)) {
        const steps = ENTGELT_TABLE[group];
        for (const step of Object.keys(steps).map(Number)) {
            const val = steps[step];
            const diff = Math.abs(val - monthlyGross);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestKey = `${group}/${step}`;
            }
        }
    }
    return closestKey;
}

// Social Security Constants 2025
export const KV_LIMIT_YEARLY = 69750;
export const V_PFLICHT_LIMIT_YEARLY = 80000;
export const TOTAL_KV_RATE = 0.175;
export const EMPLOYER_PV_RATE = 0.018;
export const RV_RATE = 0.093;
export const AV_RATE = 0.013;
export const RV_LIMIT = 7550;

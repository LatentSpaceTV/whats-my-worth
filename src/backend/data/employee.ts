/**
 * Employee specific data tables and utilities.
 */

// Entgeltsgruppen / Stufen
export const ENTGELT_TABLE: Record<string, Record<number, number>> = {
  'E 01': {
    1: 2477.70,
    2: 2512.88,
    3: 2548.05,
    4: 2583.22,
    5: 2618.40,
    6: 2653.58,
  },
  'E 02': {
    1: 2643.65,
    2: 2831.46,
    3: 2888.29,
    4: 2958.24,
    5: 3023.99,
    6: 3088.10,
  },
  'E 03': {
    1: 2878.49,
    2: 3089.20,
    3: 3160.45,
    4: 3230.98,
    5: 3303.85,
    6: 3371.68,
  },
  'E 04': {
    1: 2912.62,
    2: 3105.11,
    3: 3179.08,
    4: 3249.31,
    5: 3321.67,
    6: 3387.38,
  },
  'E 05': {
    1: 3033.49,
    2: 3226.63,
    3: 3369.14,
    4: 3519.70,
    5: 3627.91,
    6: 3745.09,
  },
  'E 06': {
    1: 3086.57,
    2: 3279.62,
    3: 3429.49,
    4: 3574.13,
    5: 3687.10,
    6: 3745.09,
  },
  'E 07': {
    1: 3205.83,
    2: 3433.38,
    3: 3574.13,
    4: 3695.43,
    5: 3805.79,
    6: 3930.67,
  },
  'E 08': {
    1: 3391.44,
    2: 3625.59,
    3: 3754.73,
    4: 3876.07,
    5: 4000.50,
    6: 4129.02,
  },
  'E 09a': {
    1: 3658.61,
    2: 3855.45,
    3: 4003.48,
    4: 4152.39,
    5: 4334.26,
    6: 4442.39,
  },
  'E 09b': {
    1: 3658.61,
    2: 3855.45,
    3: 4003.48,
    4: 4152.39,
    5: 4334.26,
    6: 4442.39,
  },
  'E 10': {
    1: 4012.19,
    2: 4260.23,
    3: 4411.43,
    4: 4562.70,
    5: 4723.62,
    6: 4843.95,
  },
  'E 11': {
    1: 4174.05,
    2: 4460.36,
    3: 4611.75,
    4: 4765.62,
    5: 4916.27,
    6: 5078.38,
  },
  'E 12': {
    1: 4295.43,
    2: 4575.32,
    3: 4727.61,
    4: 4877.93,
    5: 5043.91,
    6: 5180.96,
  },
  'E 13': {
    1: 4658.41,
    2: 4946.14,
    3: 5098.23,
    4: 5251.51,
    5: 5406.75,
    6: 5584.08,
  },
  'E 14': {
    1: 4830.56,
    2: 5123.23,
    3: 5275.86,
    4: 5428.40,
    5: 5594.99,
    6: 5746.12,
  },
  'E 15': {
    1: 4956.38,
    2: 5259.42,
    3: 5413.80,
    4: 5565.46,
    5: 5734.33,
    6: 5897.91,
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

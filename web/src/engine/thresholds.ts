// Tunable detection config. Every entry cites its source (constitution III:
// threshold config entries are verified by web/tests/content.test.ts).
export type Category = "NECK" | "SHOULDER" | "SLOUCH";

export interface Citation {
  source: string;
  reference: string;
  url: string;
}

export interface CategoryThreshold {
  category: Category;
  /** deviation (dimensionless torso-normalized units) that starts a sustained deviation */
  thetaHigh: number;
  /** recovery threshold — hysteresis: thetaLow = 0.7 * thetaHigh (FR-006) */
  thetaLow: number;
  /** deviation must hold this long before an alert (FR-006) */
  sustainMs: number;
  /** after an alert, the category re-alerts only after recovery or this cooldown */
  cooldownMs: number;
  citation: Citation;
}

export const HANSRAJ_2014: Citation = {
  source: "hansraj-2014",
  reference:
    'Hansraj KK, "Assessment of Stresses in the Cervical Spine Caused by Posture and Position of the Head," Surg Technol Int. 2014;25:277–279',
  url: "https://pubmed.ncbi.nlm.nih.gov/25393825/",
};

export const NIOSH_97_141: Citation = {
  source: "niosh-97-141",
  reference:
    "DHHS (NIOSH) Publication No. 97-141, Musculoskeletal Disorders and Workplace Factors (1997)",
  url: "https://www.cdc.gov/niosh/docs/97-141/",
};

const SUSTAIN_MS = 3000;
const COOLDOWN_MS = 60_000;

function threshold(
  category: Category,
  thetaHigh: number,
  citation: Citation
): CategoryThreshold {
  return {
    category,
    thetaHigh,
    thetaLow: thetaHigh * 0.7, // θ_low = 0.7·θ_high hysteresis (research §2)
    sustainMs: SUSTAIN_MS,
    cooldownMs: COOLDOWN_MS,
    citation,
  };
}

/** Per-category thresholds, relative to each user's calibrated baseline. */
export const THRESHOLDS: Record<Category, CategoryThreshold> = {
  // forward-head angle / ear–shoulder vertical offset (craniovertebral proxy)
  NECK: threshold("NECK", 0.1, HANSRAJ_2014),
  // shoulder-line tilt / ear–shoulder shortening (rounding proxy)
  SHOULDER: threshold("SHOULDER", 0.1, NIOSH_97_141),
  // shoulder-to-hip trunk lean
  SLOUCH: threshold("SLOUCH", 0.12, NIOSH_97_141),
};

/**
 * Single source of truth for every tunable constant in the project.
 */

export const CONFIG = {
  /* ---- Fixed frame geometry (mm), per the brief ---- */
  O2: { x: 0, y: 0 },
  O2O4: 120, // fixed pivot spacing
  O4O6: 120, // second fixed pivot spacing (angle phi6 is a design variable)
  crankLength: 50, // |O2 A| — deliberately short (see brief §58)

  /* ---- Hard link-length bounds (mm) ---- */
  Lmin: 50,
  Lmax: 200,

  /* ---- Proportion preference (soft) ---- */
  ratioMin: 0.4,
  ratioMax: 2.5,

  /* ---- Target curve ---- */
  targetWidth: 250, // mm
  targetHeight: 250, // mm
  targetSamples: 720,

  /* ---- Sampling ---- */
  samplesCoarse: 180,
  samplesMedium: 360,
  samplesFine: 720,

  /* ---- Tolerances ---- */
  loopClosureTol: 0.05, // mm — max permitted closure residual
  pathClosureTol: 0.1, // mm — |P(0) - P(2pi)|
  assemblyJumpTol: 25, // mm — per-frame joint motion that flags a branch jump
  singularityTol: 1.0, // sigma_min below this ⇒ near-singular (mm units)

  /* ---- Physical link cross-section ---- */
  linkWidth: 12, // mm
  lineDensity: 0.00035, // kg/mm of link length

  /* ---- Motor ---- */
  defaultRpm: 60,
  rpmMin: 10,
  rpmMax: 300,

  /* ---- Transmission angle preference (deg) ---- */
  muHardMin: 40,
  muHardMax: 140,
  muGoodMin: 60,
  muGoodMax: 120,

  /* ---- Objective weights (brief §15) ---- */
  weights: {
    w1_curve: 1.0,
    w2_size: 0.5,
    w3_closure: 10.0,
    w4_singularity: 2.0,
    w5_collision: 5.0,
    w6_ratio: 0.2,
    w7_gravity: 0.05,
  },

  /**
   * Normalisation scales applied to each error term BEFORE the weights above.
   *
   * The weights are only meaningful if the terms they multiply are
   * dimensionally comparable.  Raw E_curve is in millimetres (tens), while
   * E_singularity, E_collision and E_ratio are naturally O(1) — so with the
   * raw values the curve term outweighs every physical constraint by two
   * orders of magnitude, and the optimiser happily returns mechanisms that
   * trace a good heart at 1 degree transmission angle.  That directly
   * contradicts the priority order of §59, where a kinematically sound,
   * non-singular, collision-free mechanism outranks low RMS.
   *
   * curveScale converts the trajectory RMS into "how many times worse than the
   * good-result target of 10 mm", which puts it on the same footing as the
   * others without changing the ratios the brief specified.
   */
  scales: {
    /** E_curve = chamferRms / curveScale. 10 mm is the §62 "good" threshold. */
    curveScale: 10,
    /**
     * Transmission angle below which E_singularity starts to grow.
     *
     * Set to the best value this frame can physically achieve, not to the
     * textbook 60 deg ideal.  With O2O4 = 120 mm and a 50 mm crank, |A O4|
     * sweeps [70, 170] mm on every revolution, and requiring
     *   4*r0*r1*cos(mu) >= dmax^2 - dmin^2   and   2*r0*r1*(1-cos mu) <= dmin^2
     * simultaneously caps the input dyad at mu = 44.75 deg (attained at
     * lAB = lO4B = 91.9 mm).  Referencing 60 deg would make the term an
     * unreachable constant offset that carries no gradient; referencing 45 deg
     * makes it zero exactly at the physical optimum.
     */
    muReference: 45,
    /** Designs below this effective transmission angle are rejected outright. */
    muHardReject: 25,
  },

  /** Characteristic length for the 0-100 % "Heart Match" display score. */
  scoreCharacteristicLength: 40, // mm

  /* ---- Optimiser ---- */
  optimizer: {
    dePopulation: 60,
    deGenerations: 220,
    deF: 0.7,
    deCR: 0.9,
    localIterations: 900,
    keepBest: 20,
  },
} as const;

export type Weights = typeof CONFIG.weights;

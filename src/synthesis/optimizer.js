import { CONFIG } from '../mechanism/config';
import { boundsArray, clampDesign } from '../mechanism/mechanism';
import { BAND_ASSEMBLY, evaluateDesign, objectiveValue } from './objective';
import { mulberry32, repairDesign, sampleFeasiblePopulation, trySampleFeasible } from './seeding';
/**
 * Bounded Differential Evolution (rand/1/bin) followed by a bounded
 * Nelder-Mead polish — the two-stage global-then-local scheme of brief §27.
 *
 * DE is used rather than a gradient method because the objective is
 * non-convex and, worse, piecewise: it changes band discontinuously when a
 * design stops assembling.  The local stage is derivative-free for the same
 * reason (an L-BFGS-B finite-difference gradient is meaningless across a
 * feasibility boundary), but it is a genuine local refinement of each surviving
 * global candidate.
 */
export function optimize(options = {}) {
    const seed = options.seed ?? 20260814;
    const rng = mulberry32(seed);
    const NP = options.population ?? CONFIG.optimizer.dePopulation;
    const GEN = options.generations ?? CONFIG.optimizer.deGenerations;
    const F = options.F ?? CONFIG.optimizer.deF;
    const CR = options.CR ?? CONFIG.optimizer.deCR;
    const keepBest = options.keepBest ?? CONFIG.optimizer.keepBest;
    const refineAt = options.refineAt ?? {
        medium: Math.floor(GEN * 0.55),
        fine: Math.floor(GEN * 0.85),
    };
    const bounds = boundsArray();
    const dim = bounds.length;
    let evaluations = 0;
    const report = (p) => options.onProgress?.({ ...p, evaluations });
    // ---- Seeding -----------------------------------------------------------
    report({
        phase: 'seeding',
        generation: 0,
        totalGenerations: GEN,
        bestJ: Infinity,
        feasibleCount: 0,
        message: 'Constructing feasible seed population…',
    });
    const pop = sampleFeasiblePopulation(NP, rng);
    // Top up with plain random draws if the constructive sampler came up short.
    while (pop.length < NP) {
        pop.push(bounds.map(([lo, hi]) => lo + rng() * (hi - lo)));
    }
    let level = 'coarse';
    const fit = pop.map((x) => {
        evaluations++;
        return objectiveValue(x, level);
    });
    const archive = [];
    const pushArchive = (x, J) => {
        if (!Number.isFinite(J) || J >= 1e4)
            return; // feasible band only
        // Deduplicate on the design vector (1 mm / 1 deg resolution).
        const key = x.map((v) => Math.round(v)).join(',');
        if (archive.some((c) => c.x.map((v) => Math.round(v)).join(',') === key))
            return;
        archive.push({ x: x.slice(), J });
        archive.sort((a, b) => a.J - b.J);
        if (archive.length > keepBest * 4)
            archive.length = keepBest * 4;
    };
    pop.forEach((x, i) => pushArchive(x, fit[i]));
    const feasibleCount = () => fit.filter((f) => f < 1e4).length;
    // ---- Differential Evolution -------------------------------------------
    for (let g = 0; g < GEN; g++) {
        if (options.shouldStop?.())
            break;
        // Progressive refinement: re-score the population when the sampling
        // density changes so comparisons stay consistent.
        const nextLevel = g >= refineAt.fine ? 'fine' : g >= refineAt.medium ? 'medium' : 'coarse';
        if (nextLevel !== level) {
            level = nextLevel;
            for (let i = 0; i < NP; i++) {
                evaluations++;
                fit[i] = objectiveValue(pop[i], level);
            }
        }
        let bestIdx = 0;
        for (let i = 1; i < NP; i++)
            if (fit[i] < fit[bestIdx])
                bestIdx = i;
        for (let i = 0; i < NP; i++) {
            let r1 = i;
            let r2 = i;
            let r3 = i;
            while (r1 === i)
                r1 = Math.floor(rng() * NP);
            while (r2 === i || r2 === r1)
                r2 = Math.floor(rng() * NP);
            while (r3 === i || r3 === r1 || r3 === r2)
                r3 = Math.floor(rng() * NP);
            // Alternate rand/1 (explore) with current-to-best/1 (exploit). Pure
            // rand/1 converges too slowly on a 15-dimensional non-convex objective;
            // pure current-to-best collapses onto the first decent basin.
            const useBest = rng() < 0.5;
            const jrand = Math.floor(rng() * dim);
            const trial = new Array(dim);
            for (let j = 0; j < dim; j++) {
                if (rng() < CR || j === jrand) {
                    trial[j] = useBest
                        ? pop[i][j] + F * (pop[bestIdx][j] - pop[i][j]) + F * (pop[r1][j] - pop[r2][j])
                        : pop[r1][j] + F * (pop[r2][j] - pop[r3][j]);
                }
                else {
                    trial[j] = pop[i][j];
                }
            }
            let cand = clampDesign(trial);
            evaluations++;
            let Jt = objectiveValue(cand, level);
            // Lamarckian repair, applied ONLY as a rescue.  Projecting every
            // offspring onto the feasible dyad geometry pins two coordinates to
            // their interval bounds and destroys DE's self-adapted step sizes — it
            // measurably stalled the search.  Repairing only the offspring that
            // failed to assemble keeps the feasible exploration untouched.
            if (Jt >= BAND_ASSEMBLY) {
                const repaired = repairDesign(cand, 38);
                if (repaired) {
                    evaluations++;
                    const Jr = objectiveValue(repaired, level);
                    if (Jr < Jt) {
                        cand = repaired;
                        Jt = Jr;
                    }
                }
            }
            if (Jt <= fit[i]) {
                pop[i] = cand;
                fit[i] = Jt;
                pushArchive(cand, Jt);
            }
        }
        // Inject fresh constructive seeds into the worst slots to fight stagnation.
        if (g > 0 && g % 25 === 0) {
            const order = fit.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]);
            for (let k = 0; k < Math.min(4, NP); k++) {
                const cand = trySampleFeasible(rng);
                if (!cand)
                    continue;
                const idx = order[k][1];
                evaluations++;
                const Jc = objectiveValue(cand, level);
                if (Jc < fit[idx]) {
                    pop[idx] = cand;
                    fit[idx] = Jc;
                    pushArchive(cand, Jc);
                }
            }
        }
        if (g % 5 === 0 || g === GEN - 1) {
            report({
                phase: 'global',
                generation: g + 1,
                totalGenerations: GEN,
                bestJ: Math.min(...fit),
                feasibleCount: feasibleCount(),
                message: `DE generation ${g + 1}/${GEN} (N=${level === 'coarse' ? CONFIG.samplesCoarse : level === 'medium' ? CONFIG.samplesMedium : CONFIG.samplesFine})`,
            });
        }
    }
    // ---- Local refinement of the surviving candidates ----------------------
    const localIters = options.localIterations ?? CONFIG.optimizer.localIterations;
    const seeds = archive.slice(0, Math.min(keepBest, archive.length));
    const refined = [];
    seeds.forEach((cand, idx) => {
        if (options.shouldStop?.())
            return;
        report({
            phase: 'local',
            generation: idx + 1,
            totalGenerations: seeds.length,
            bestJ: refined.length ? refined[0].J : cand.J,
            feasibleCount: archive.length,
            message: `Nelder-Mead refinement ${idx + 1}/${seeds.length}`,
        });
        const r = nelderMead(cand.x, (x) => {
            evaluations++;
            return objectiveValue(x, 'fine');
        }, bounds, localIters, rng);
        refined.push(r.J <= cand.J ? r : cand);
        refined.sort((a, b) => a.J - b.J);
    });
    // ---- Final scoring at full resolution ----------------------------------
    const finalPool = (refined.length ? refined : seeds)
        .map((c) => {
        const m = evaluateDesign(c.x, { level: 'fine', computeGravity: true });
        evaluations++;
        return { x: c.x, J: m.J };
    })
        .filter((c) => Number.isFinite(c.J) && c.J < 1e4)
        .sort((a, b) => a.J - b.J)
        .slice(0, keepBest);
    report({
        phase: 'done',
        generation: GEN,
        totalGenerations: GEN,
        bestJ: finalPool.length ? finalPool[0].J : Infinity,
        feasibleCount: finalPool.length,
        message: `Finished — ${finalPool.length} valid mechanism(s) retained`,
    });
    return { best: finalPool, evaluations, seed, generations: GEN };
}
/**
 * Bounded Nelder-Mead simplex. Derivative-free, which matters here because the
 * objective is discontinuous at the feasibility boundary.
 */
export function nelderMead(x0, f, bounds, maxIter, rng) {
    const n = x0.length;
    const clampX = (x) => x.map((v, i) => Math.min(bounds[i][1], Math.max(bounds[i][0], v)));
    const simplex = [clampX(x0)];
    for (let i = 0; i < n; i++) {
        const step = 0.05 * (bounds[i][1] - bounds[i][0]) * (0.5 + rng());
        const p = x0.slice();
        p[i] += step;
        simplex.push(clampX(p));
    }
    let fv = simplex.map(f);
    const alpha = 1;
    const gamma = 2;
    const rho = 0.5;
    const sigma = 0.5;
    for (let iter = 0; iter < maxIter; iter++) {
        const order = fv.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
        const best = order[0][1];
        const worst = order[n][1];
        const second = order[n - 1][1];
        // Converged?
        if (Math.abs(fv[worst] - fv[best]) < 1e-9)
            break;
        const centroid = new Array(n).fill(0);
        for (let i = 0; i <= n; i++) {
            if (i === worst)
                continue;
            for (let j = 0; j < n; j++)
                centroid[j] += simplex[i][j] / n;
        }
        const reflect = clampX(centroid.map((c, j) => c + alpha * (c - simplex[worst][j])));
        const fr = f(reflect);
        if (fr < fv[best]) {
            const expand = clampX(centroid.map((c, j) => c + gamma * (reflect[j] - c)));
            const fe = f(expand);
            if (fe < fr) {
                simplex[worst] = expand;
                fv[worst] = fe;
            }
            else {
                simplex[worst] = reflect;
                fv[worst] = fr;
            }
        }
        else if (fr < fv[second]) {
            simplex[worst] = reflect;
            fv[worst] = fr;
        }
        else {
            const contract = clampX(centroid.map((c, j) => c + rho * (simplex[worst][j] - c)));
            const fc = f(contract);
            if (fc < fv[worst]) {
                simplex[worst] = contract;
                fv[worst] = fc;
            }
            else {
                for (let i = 0; i <= n; i++) {
                    if (i === best)
                        continue;
                    simplex[i] = clampX(simplex[i].map((v, j) => simplex[best][j] + sigma * (v - simplex[best][j])));
                }
                fv = simplex.map(f);
            }
        }
    }
    let bi = 0;
    for (let i = 1; i <= n; i++)
        if (fv[i] < fv[bi])
            bi = i;
    return { x: simplex[bi], J: fv[bi] };
}

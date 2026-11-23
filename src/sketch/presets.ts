import type { Sketch } from './model';

/**
 * Starting points for the sketcher. Each is a classic, chosen so the first
 * thing the reader sees runs: a Grashof crank-rocker, the same linkage with a
 * coupler point off the line of the coupler (where the interesting curves
 * are), and a Watt six-bar, the smallest linkage the dyad workbench's
 * families do not start from.
 */
export type Preset = { id: 'fourbar' | 'coupler' | 'watt' | 'jansen'; sketch: Sketch };

const j = (id: string, x: number, y: number, ground = false) => ({ id, x, y, ground });
const len = (s: Pick<Sketch, 'joints'>, a: string, b: string) => {
  const p = s.joints.find((q) => q.id === a)!;
  const q = s.joints.find((r) => r.id === b)!;
  return Math.hypot(p.x - q.x, p.y - q.y);
};
const build = (joints: Sketch['joints'], pairs: [string, string][], motor: number, tracers: string[]): Sketch => {
  const links = pairs.map(([a, b], i) => ({ id: `L${i + 1}`, a, b, length: len({ joints }, a, b) }));
  return { joints, links, motor: links[motor].id, tracers };
};

export const PRESETS: Preset[] = [
  {
    id: 'fourbar',
    // Ground 120, crank 40, coupler 110, rocker 90: s + l = 160 < p + q = 200.
    sketch: build(
      [j('P1', 0, 0, true), j('P2', 120, 0, true), j('P3', 0, 40), j('P4', 103.9, 88.9)],
      [['P1', 'P3'], ['P3', 'P4'], ['P4', 'P2']],
      0,
      ['P4'],
    ),
  },
  {
    id: 'coupler',
    sketch: build(
      [j('P1', 0, 0, true), j('P2', 120, 0, true), j('P3', 0, 40), j('P4', 103.9, 88.9), j('P5', 40, 140)],
      [['P1', 'P3'], ['P3', 'P4'], ['P4', 'P2'], ['P3', 'P5'], ['P4', 'P5']],
      0,
      ['P5'],
    ),
  },
  {
    id: 'watt',
    sketch: build(
      [
        j('P1', 0, 0, true),
        j('P2', 120, 0, true),
        j('P3', 0, 40),
        j('P4', 103.9, 88.9),
        j('P5', 180, 110),
        j('P6', 340, 60, true),
        j('P7', 230, 200),
      ],
      [['P1', 'P3'], ['P3', 'P4'], ['P4', 'P2'], ['P2', 'P5'], ['P4', 'P5'], ['P5', 'P7'], ['P7', 'P6']],
      0,
      ['P7'],
    ),
  },
  {
    id: 'jansen',
    sketch: jansen(),
  },
];

/**
 * Theo Jansen's Strandbeest leg, with his published "holy numbers" (a–m,
 * in the proportions he found by evolutionary search). Eight bars, two
 * rigid triangles (B–D–E and F–G–H), one crank; the foot H traces a path
 * with a long flat bottom — the stride — and a quick lift back.
 *
 * The lengths are given exactly rather than derived from the drawn
 * positions, and the positions are the solver's assembly at a crank angle of
 * 90° on the branch where the leg hangs down, so the example is the real
 * linkage and not a rounding of it. Labels follow Jansen's drawing: O is the
 * crank centre, B the second ground pivot, H the foot.
 */
function jansen(): Sketch {
  const n = { a: 38, b: 41.5, c: 39.3, d: 40.1, e: 55.8, f: 39.4, g: 36.7, h: 65.7, i: 49, j: 50, k: 61.9, l: 7.8, m: 15 };
  const joints = [
    j('O', 0, 0, true),
    j('B', -n.a, -n.l, true),
    j('C', 0, 15),
    j('D', -46.736, 32.77),
    j('E', -77.668, -13.672),
    j('F', -20.995, -43.231),
    j('G', -57.448, -47.487),
    j('H', -7.689, -90.389),
  ];
  const bars: [string, string, number][] = [
    ['O', 'C', n.m],
    ['C', 'D', n.j],
    ['C', 'F', n.k],
    ['B', 'D', n.b],
    ['B', 'F', n.c],
    ['B', 'E', n.d],
    ['D', 'E', n.e],
    ['E', 'G', n.f],
    ['F', 'G', n.g],
    ['G', 'H', n.h],
    ['F', 'H', n.i],
  ];
  return {
    joints,
    links: bars.map(([a, b, length], k) => ({ id: `L${k + 1}`, a, b, length })),
    motor: 'L1',
    tracers: ['H'],
  };
}

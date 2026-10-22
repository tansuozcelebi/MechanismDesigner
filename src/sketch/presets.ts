import type { Sketch } from './model';

/**
 * Starting points for the sketcher. Each is a classic, chosen so the first
 * thing the reader sees runs: a Grashof crank-rocker, the same linkage with a
 * coupler point off the line of the coupler (where the interesting curves
 * are), and a Watt six-bar, the smallest linkage the dyad workbench's
 * families do not start from.
 */
export type Preset = { id: 'fourbar' | 'coupler' | 'watt'; sketch: Sketch };

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
];

/** Shared palette so the canvas and the DOM panels stay in one visual system. */
export const THEME = {
  background: 0x0e1116,
  grid: 0x1b2029,
  gridMajor: 0x2a323f,
  axis: 0x3d4757,
  axisLabel: '#5d6b80',

  ground: 0x8fa3bd,
  groundPivot: 0xe8eef7,
  groundHatch: 0x55637a,

  movingJoint: 0xcfd9e6,
  jointCore: 0x0e1116,

  linkDefault: 0x5b7fa8,
  linkInput: 0xf2a33c,
  linkOutput: 0x46c1a4,
  linkCollide: 0xe05252,
  centreLine: 0x9fb3cc,

  selection: 0xffd166,
  targetHandle: 0x7fd1ff,
  targetHandleActive: 0xffd166,

  led: 0xff2d55,
  ledGlow: 0xff5c7a,
  trail: 0xff4d6d,
  target: 0x8892a4,
  targetBox: 0x3a4453,

  com: 0xffd166,
  velocity: 0x4cc9f0,
  gravityVec: 0xb388ff,
  loopVec: [0xff9f1c, 0x2ec4b6, 0xe71d36],

  css: {
    bg: '#0e1116',
    panel: '#151a21',
    panelAlt: '#1a212b',
    border: '#242c38',
    text: '#dbe3ee',
    textDim: '#8493a8',
    accent: '#f2a33c',
    good: '#46c1a4',
    warn: '#e8b93b',
    bad: '#e05252',
  },
} as const;

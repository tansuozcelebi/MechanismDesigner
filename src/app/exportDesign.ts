import { CONFIG } from '../mechanism/config';
import { buildGeometry } from '../mechanism/mechanism';
import { TOPOLOGY } from '../mechanism/topology';
import type { DesignVector } from '../mechanism/types';
import type { Metrics } from '../synthesis/objective';
import { DESIGN_KEYS } from '../mechanism/types';
import { designToArray } from '../mechanism/mechanism';

/**
 * Design export (brief §52) — the handoff format for later CAD generation.
 * Everything a downstream CAD script needs: pivot coordinates, every printed
 * member length, the layer each body sits in, and the measured performance.
 */
export function buildExportJson(
  design: DesignVector,
  metrics: Metrics | null,
  label: string,
): Record<string, unknown> {
  const geo = buildGeometry(design);
  const arr = designToArray(design);

  const designRecord: Record<string, number> = {};
  DESIGN_KEYS.forEach((k, i) => {
    designRecord[k] = +arr[i].toFixed(4);
  });

  return {
    schema: 'heart-linkage-design/1',
    label,
    exportedAt: new Date().toISOString(),
    target: {
      type: 'heart',
      width_mm: CONFIG.targetWidth,
      height_mm: CONFIG.targetHeight,
      equation: {
        x: '16 sin^3(t)',
        y: '13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)',
        t: '[0, 2*pi)',
        note: 'sampled then affinely rescaled so the bounding box is exactly width x height',
      },
    },
    topology: {
      family: 'planar 8-bar, three fixed pivots, three RRR Assur dyads in series',
      links: TOPOLOGY.links.length,
      joints: TOPOLOGY.joints.length,
      mobility: TOPOLOGY.mobility,
      independentLoops: TOPOLOGY.loopCount,
      loops: TOPOLOGY.loops,
      graph: TOPOLOGY.links.map((l) => ({ id: l.id, role: l.role, joints: l.jointIds })),
    },
    motor: {
      inputJoint: 'O2',
      crankLength_mm: CONFIG.crankLength,
      inputLink: 'L2',
    },
    fixedJoints: {
      O2: { x: +geo.O2.x.toFixed(4), y: +geo.O2.y.toFixed(4) },
      O4: { x: +geo.O4.x.toFixed(4), y: +geo.O4.y.toFixed(4) },
      O6: { x: +geo.O6.x.toFixed(4), y: +geo.O6.y.toFixed(4) },
    },
    designVector: designRecord,
    links: TOPOLOGY.links
      .filter((l) => l.id !== 'ground')
      .map((l) => ({
        id: l.id,
        role: l.role,
        joints: l.jointIds,
        markers: l.markerIds ?? [],
        assemblyLayer: metrics?.layerOf?.[l.id] ?? null,
        members: geo.members
          .filter((m) => m.linkId === l.id)
          .map((m) => ({ from: m.from, to: m.to, length_mm: +m.length.toFixed(4) })),
      })),
    manufacturing: {
      linkWidth_mm: CONFIG.linkWidth,
      lineDensity_kg_per_mm: CONFIG.lineDensity,
      lengthBounds_mm: [CONFIG.Lmin, CONFIG.Lmax],
      assemblyLayers: metrics?.layerCount ?? null,
      maxPinSpan_layers: metrics?.maxPinSpan ?? null,
      stackThickness_mm: metrics?.stackThickness ?? null,
    },
    optimizedMetrics: metrics
      ? {
          objective: +metrics.J.toFixed(6),
          rmsError_mm: +metrics.match.chamferRms.toFixed(4),
          paramRmsError_mm: +metrics.match.paramRms.toFixed(4),
          maxError_mm: +metrics.match.maxError.toFixed(4),
          actualWidth_mm: +metrics.width.toFixed(3),
          actualHeight_mm: +metrics.height.toFixed(3),
          heartMatchPercent: +metrics.heartMatchPercent.toFixed(2),
          fullRotation: metrics.fullRotation,
          validFrames: metrics.validFrames,
          frames: metrics.frames,
          assemblyJumps: metrics.assemblyJumps,
          maxLoopClosureError_mm: metrics.maxLoopClosureError,
          pathClosure_mm: metrics.pathClosure,
          minTransmissionAngle_deg: +metrics.minTransmissionAngle.toFixed(3),
          effectiveTransmissionAngle_deg: +metrics.effectiveTransmissionAngle.toFixed(3),
          singularityMargin: +metrics.minSigma.toFixed(5),
          coplanarInterferenceFrames: metrics.collisionFrames,
          peakGravityTorque_Nm: +metrics.peakGravityTorque.toFixed(5),
          objectiveTerms: metrics.terms,
        }
      : null,
    objectiveWeights: CONFIG.weights,
    objectiveScales: CONFIG.scales,
  };
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

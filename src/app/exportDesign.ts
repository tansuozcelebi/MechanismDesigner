import { CONFIG, snapshotConfig } from '../mechanism/config';
import { buildGeometry } from '../mechanism/mechanism';
import { topologyOf } from '../mechanism/topology';
import { groundJointId, type MechanismSpec } from '../mechanism/spec';
import type { Metrics } from '../synthesis/objective';
import { exportTarget, type TargetCurve } from '../synthesis/targetCurve';
import { APP_NAME } from '../i18n/translations';

/**
 * Design export — the handoff format for later CAD generation.
 *
 * Deliberately self-contained: the mechanism spec, the constraint settings and
 * the target curve all travel with the geometry, because a parameter vector is
 * meaningless without the topology it indexes and the limits it was optimised
 * under.  Re-importing this file reproduces the design exactly.
 */
export function buildExportJson(
  spec: MechanismSpec,
  params: number[],
  metrics: Metrics | null,
  label: string,
  target: TargetCurve,
): Record<string, unknown> {
  const geo = buildGeometry(spec, params);
  const topo = topologyOf(spec);

  const designVector: Record<string, number> = {};
  geo.layout.forEach((p, i) => {
    designVector[p.label] = +params[i].toFixed(4);
  });

  const fixedJoints: Record<string, { x: number; y: number }> = {};
  geo.ground.forEach((p, i) => {
    const id = groundJointId(i);
    fixedJoints[spec.labels?.[id] ?? id] = { x: +p.x.toFixed(4), y: +p.y.toFixed(4) };
  });

  return {
    schema: 'kreamet-design/2',
    application: APP_NAME,
    label,
    exportedAt: new Date().toISOString(),

    target: exportTarget(target),

    topology: {
      family: 'planar chain: one crank plus N RRR Assur dyads in series',
      dyads: spec.dyads.length,
      links: topo.links.length,
      joints: topo.joints.length,
      mobility: topo.mobility,
      independentLoops: topo.loopCount,
      loops: topo.loops,
      spec,
      graph: topo.links.map((l) => ({ id: l.id, role: l.role, joints: l.jointIds })),
    },

    motor: {
      inputJoint: spec.labels?.G0 ?? groundJointId(0),
      crankLength_mm: CONFIG.crankLength,
      inputLink: 'crank',
    },

    fixedJoints,
    designVector,
    designArray: params.map((v) => +v.toFixed(4)),

    links: topo.links
      .filter((l) => l.id !== 'ground')
      .map((l) => ({
        id: l.id,
        label: l.label,
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
          matchPercent: +metrics.heartMatchPercent.toFixed(2),
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

    /** Full constraint set in force when this design was produced. */
    settings: snapshotConfig(),
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

/** Read a user-picked file as text. */
export function readFileText(accept = 'application/json,.json'): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result ?? '') });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

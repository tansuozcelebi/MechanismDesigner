import * as THREE from 'three';
import { THEME } from './theme';
import { CONFIG } from '../mechanism/config';
import type { Vec2 } from '../utils/math';

/**
 * Orthographic 2D scene in millimetre world coordinates (brief §29).
 *
 * The camera does all the scaling, so every geometry in the scene is authored
 * in real millimetres and nothing needs a conversion factor.  Z is used only
 * for draw ordering.
 */
export const Z = {
  grid: -20,
  axes: -18,
  targetBox: -16,
  target: -14,
  trail: -12,
  ground: -6,
  link: 0,
  joint: 6,
  debug: 10,
  led: 14,
  label: 16,
} as const;

export class Scene2D {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly renderer: THREE.WebGLRenderer;

  private width = 1;
  private height = 1;
  /** World millimetres visible across the canvas height. */
  private viewHeightMm = 800;
  private center: Vec2 = { x: 60, y: 120 };

  private gridGroup = new THREE.Group();
  readonly world = new THREE.Group();

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(THEME.background);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    this.camera.position.set(0, 0, 100);

    this.scene.add(this.gridGroup);
    this.scene.add(this.world);
    this.buildGrid();
  }

  /* ----------------------------- view ---------------------------------- */

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.updateCamera();
  }

  setView(center: Vec2, viewHeightMm: number): void {
    this.center = center;
    this.viewHeightMm = Math.max(50, viewHeightMm);
    this.updateCamera();
  }

  get view(): { center: Vec2; heightMm: number } {
    return { center: this.center, heightMm: this.viewHeightMm };
  }

  zoomBy(factor: number, pivotWorld?: Vec2): void {
    const next = Math.min(4000, Math.max(80, this.viewHeightMm * factor));
    if (pivotWorld) {
      // Keep the world point under the cursor fixed while zooming.
      const k = next / this.viewHeightMm;
      this.center = {
        x: pivotWorld.x + (this.center.x - pivotWorld.x) * k,
        y: pivotWorld.y + (this.center.y - pivotWorld.y) * k,
      };
    }
    this.viewHeightMm = next;
    this.updateCamera();
  }

  panByPixels(dxPx: number, dyPx: number): void {
    const mmPerPx = this.viewHeightMm / this.height;
    this.center = {
      x: this.center.x - dxPx * mmPerPx,
      y: this.center.y + dyPx * mmPerPx,
    };
    this.updateCamera();
  }

  /** Notified whenever the projection changes, so the UI scale bar stays true. */
  onViewChange: ((v: { center: Vec2; heightMm: number; mmPerPixel: number }) => void) | null = null;

  private updateCamera(): void {
    const aspect = this.width / this.height;
    const halfH = this.viewHeightMm / 2;
    const halfW = halfH * aspect;

    // An orthographic frustum is defined RELATIVE to the camera's own
    // transform.  Writing absolute world bounds here AND moving the camera to
    // the view centre applies the centring twice, which shifts everything on
    // screen by exactly `center` — it silently breaks both the picture and
    // toWorld() (and therefore crank picking).  Keep the camera at the origin
    // and let the bounds carry the absolute world extent.
    this.camera.position.set(0, 0, 100);
    this.camera.left = this.center.x - halfW;
    this.camera.right = this.center.x + halfW;
    this.camera.top = this.center.y + halfH;
    this.camera.bottom = this.center.y - halfH;
    this.camera.updateProjectionMatrix();
    this.buildGrid();
    this.onViewChange?.({
      center: this.center,
      heightMm: this.viewHeightMm,
      mmPerPixel: this.mmPerPixel,
    });
  }

  /** Millimetres per screen pixel — used to keep line widths visually stable. */
  get mmPerPixel(): number {
    return this.viewHeightMm / this.height;
  }

  /** Convert a pointer event position (client px) to world millimetres. */
  toWorld(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const halfH = this.viewHeightMm / 2;
    const halfW = halfH * (this.width / this.height);
    return { x: this.center.x + nx * halfW, y: this.center.y + ny * halfH };
  }

  /* ----------------------------- grid ---------------------------------- */

  private gridVisible = true;

  setGridVisible(v: boolean): void {
    this.gridVisible = v;
    this.gridGroup.visible = v;
  }

  /** 50 mm grid with 250 mm major lines, rebuilt only when the view changes. */
  private buildGrid(): void {
    for (const child of [...this.gridGroup.children]) {
      this.gridGroup.remove(child);
      const m = child as THREE.Line;
      m.geometry?.dispose();
    }

    const step = 50;
    const major = 250;
    const halfH = this.viewHeightMm / 2;
    const halfW = halfH * (this.width / this.height);
    const x0 = Math.floor((this.center.x - halfW) / step) * step;
    const x1 = Math.ceil((this.center.x + halfW) / step) * step;
    const y0 = Math.floor((this.center.y - halfH) / step) * step;
    const y1 = Math.ceil((this.center.y + halfH) / step) * step;

    const minor: number[] = [];
    const majorPts: number[] = [];
    for (let x = x0; x <= x1; x += step) {
      const arr = x % major === 0 ? majorPts : minor;
      arr.push(x, y0, Z.grid, x, y1, Z.grid);
    }
    for (let y = y0; y <= y1; y += step) {
      const arr = y % major === 0 ? majorPts : minor;
      arr.push(x0, y, Z.grid, x1, y, Z.grid);
    }

    const mk = (pts: number[], color: number, z: number) => {
      if (!pts.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const line = new THREE.LineSegments(
        g,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }),
      );
      line.position.z = z;
      this.gridGroup.add(line);
    };
    mk(minor, THEME.grid, Z.grid);
    mk(majorPts, THEME.gridMajor, Z.grid);

    // X / Y axes through the origin.
    const axes: number[] = [x0, 0, Z.axes, x1, 0, Z.axes, 0, y0, Z.axes, 0, y1, Z.axes];
    mk(axes, THEME.axis, Z.axes);

    this.gridGroup.visible = this.gridVisible;
  }

  /** Frame the mechanism plus the target box with a comfortable margin. */
  fitTo(points: Vec2[]): void {
    if (!points.length) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    if (!Number.isFinite(minX)) return;
    const w = Math.max(CONFIG.targetWidth, maxX - minX);
    const h = Math.max(CONFIG.targetHeight, maxY - minY);
    const aspect = this.width / this.height;
    // The fit must satisfy BOTH axes, so take the larger of "fit the height"
    // and "fit the width".  The margin is generous on purpose: several markers
    // (ground symbols, joint rings, the LED glow) are sized in SCREEN space and
    // therefore grow after these bounds are measured, so a tight fit leaves
    // them clipped at the canvas edge.
    const needH = Math.max(h, w / aspect) * 1.12 + 20;
    this.setView({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, needH);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* Small geometry helpers shared by the renderers                       */
/* ------------------------------------------------------------------ */

/** A filled circle in the XY plane. */
export function makeDisc(radius: number, color: number, segments = 32): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, segments);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
  return new THREE.Mesh(geo, mat);
}

/** A ring (annulus) in the XY plane. */
export function makeRing(
  inner: number,
  outer: number,
  color: number,
  segments = 40,
): THREE.Mesh {
  const geo = new THREE.RingGeometry(inner, outer, segments);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
  return new THREE.Mesh(geo, mat);
}

/**
 * A capsule (stadium) polygon: a rectangle of the given width with semicircular
 * caps.  This is the actual 12 mm bar cross-section, drawn as real geometry
 * rather than a line so that the interference clearance is visible on screen.
 */
export function makeCapsuleGeometry(length: number, width: number, capSegments = 12): THREE.ShapeGeometry {
  const r = width / 2;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, Math.PI / 2, -Math.PI / 2, true);
  shape.lineTo(length, -r);
  shape.absarc(length, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(0, r);
  return new THREE.ShapeGeometry(shape, capSegments);
}

/** Polyline from a list of world points. */
export function makePolyline(points: Vec2[], color: number, z: number, closed = false): THREE.Line {
  const pos: number[] = [];
  for (const p of points) pos.push(p.x, p.y, z);
  if (closed && points.length) pos.push(points[0].x, points[0].y, z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
}

/** Dashed polyline. Requires computeLineDistances(). */
export function makeDashedPolyline(
  points: Vec2[],
  color: number,
  z: number,
  dashSize: number,
  gapSize: number,
  closed = true,
): THREE.Line {
  const pos: number[] = [];
  for (const p of points) pos.push(p.x, p.y, z);
  if (closed && points.length) pos.push(points[0].x, points[0].y, z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const line = new THREE.Line(
    geo,
    new THREE.LineDashedMaterial({ color, dashSize, gapSize, transparent: true, opacity: 0.9 }),
  );
  line.computeLineDistances();
  return line;
}

export function disposeTree(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

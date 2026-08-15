import * as THREE from 'three';
/**
 * Canvas-texture text sprites.
 *
 * Deliberately not a font-loader dependency: labels are short, few, and only
 * need to be legible.  Textures are cached by content so repeated labels (link
 * numbers, joint names) share one texture.
 */
const cache = new Map();
function textTexture(text, color, bg) {
    const key = `${text}|${color}|${bg ?? ''}`;
    const hit = cache.get(key);
    if (hit)
        return hit;
    const pad = 8;
    const fontPx = 44;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const h = fontPx + pad * 2;
    canvas.width = w;
    canvas.height = h;
    const c2 = canvas.getContext('2d');
    c2.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c2.textBaseline = 'middle';
    if (bg) {
        c2.fillStyle = bg;
        c2.globalAlpha = 0.78;
        c2.fillRect(0, 0, w, h);
        c2.globalAlpha = 1;
    }
    c2.fillStyle = color;
    c2.fillText(text, pad, h / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    cache.set(key, tex);
    return tex;
}
export function makeLabel(text, color = '#dbe3ee', bg = '#0e1116') {
    const tex = textTexture(text, color, bg);
    const img = tex.image;
    const aspect = img.width / img.height;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    return { sprite, aspect };
}
/** Size a label so it renders at a constant pixel height. */
export function scaleLabel(label, mmPerPixel, pixelHeight = 13) {
    const h = mmPerPixel * pixelHeight;
    label.sprite.scale.set(h * label.aspect, h, 1);
}

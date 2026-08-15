/**
 * The KREAMET mark, drawn as vector art rather than shipped as a bitmap.
 *
 * The logo is a K built out of the things the app actually models: a gear, a
 * fixed frame post, and two links meeting at a revolute bearing, over a faint
 * blueprint. Keeping it as SVG means it stays sharp at every size, costs no
 * extra request, inherits the page's colours, and — because the header renders
 * it at 26 px and the About hero at 200 px — one file serves both.
 */

/** Gradient ids are namespaced per instance: two logos on one page would
 * otherwise share (and fight over) the same `<defs>` ids. */
let seq = 0;

export function LogoMark({ size = 28, id }: { size?: number; id?: string }) {
  const uid = id ?? `kmark${++seq}`;
  const steel = `${uid}-steel`;
  const blue = `${uid}-blue`;
  const dark = `${uid}-dark`;
  const ring = `${uid}-ring`;

  return (
    <svg
      width={size}
      height={(size * 100) / 118}
      viewBox="0 0 118 100"
      role="img"
      aria-label="KREAMET"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={steel} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#e6ecf3" />
          <stop offset="0.45" stopColor="#9aa7b6" />
          <stop offset="1" stopColor="#4d5865" />
        </linearGradient>
        <linearGradient id={blue} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#3aa0ff" />
          <stop offset="0.55" stopColor="#1b6fe0" />
          <stop offset="1" stopColor="#0b47a0" />
        </linearGradient>
        <linearGradient id={dark} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="#3d454f" />
          <stop offset="0.5" stopColor="#20262e" />
          <stop offset="1" stopColor="#0e1116" />
        </linearGradient>
        <radialGradient id={ring} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#f2f6fa" />
          <stop offset="0.55" stopColor="#8f9cab" />
          <stop offset="1" stopColor="#39424e" />
        </radialGradient>
      </defs>

      {/* Blueprint construction geometry, the way a layout drawing is set out. */}
      <g stroke="#2f7fd6" strokeWidth="0.7" fill="none" opacity="0.38">
        <circle cx="74" cy="46" r="34" />
        <circle cx="74" cy="46" r="24" strokeDasharray="3 3" />
        <circle cx="99" cy="14" r="4" />
        <circle cx="96" cy="76" r="3.4" />
        <path d="M40 46 H112 M74 8 V88" strokeDasharray="6 4" opacity="0.7" />
      </g>

      {/* Drive gear. Teeth are generated rather than hand-placed so the pitch
          stays exact — a lopsided gear on an engineering logo reads as an error. */}
      <g>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <rect
              key={i}
              x={-3.6}
              y={-27.5}
              width={7.2}
              height={9}
              rx={1.2}
              fill={`url(#${steel})`}
              transform={`translate(30 50) rotate(${(a * 180) / Math.PI})`}
            />
          );
        })}
        <circle cx="30" cy="50" r="22" fill={`url(#${steel})`} />
        <circle cx="30" cy="50" r="13" fill="#1b6fe0" opacity="0.9" />
        <circle cx="30" cy="50" r="9" fill="#0e1116" />
      </g>

      {/* Fixed frame post — the K's stem, and the ground link of the mechanism. */}
      <rect x="47" y="4" width="15" height="90" rx="1.5" fill={`url(#${dark})`} />

      {/* Output link, running down-left across the gear. */}
      <path
        d="M70 46 L38 88 L48 94 L78 54 Z"
        fill={`url(#${steel})`}
      />

      {/* The two blue links that form the K's diagonals. */}
      <path d="M70 46 L104 4 L118 4 L82 50 Z" fill={`url(#${blue})`} />
      <path d="M74 44 L112 94 L98 96 L66 56 Z" fill={`url(#${blue})`} />

      {/* Revolute pair where they meet: the one joint the whole mark turns on. */}
      <g>
        <circle cx="72" cy="49" r="13" fill={`url(#${ring})`} />
        <circle cx="72" cy="49" r="9.5" fill="#0f4fa8" />
        <circle cx="72" cy="49" r="6" fill={`url(#${ring})`} />
        <circle cx="72" cy="49" r="2.4" fill="#0e1116" />
      </g>
    </svg>
  );
}

/**
 * Mark plus wordmark. `KREA` in gunmetal and `MET` in blue reproduces the
 * two-tone split of the original artwork.
 */
export function LogoFull({
  size = 44,
  tagline,
}: {
  size?: number;
  tagline?: string;
}) {
  return (
    <div className="logofull" style={{ ['--logo-size' as string]: `${size}px` }}>
      <LogoMark size={size * 1.25} />
      <div className="logotext">
        <div className="wordmark" style={{ fontSize: size * 0.86 }}>
          <span className="krea">KREA</span>
          <span className="met">MET</span>
        </div>
        {tagline && (
          <div className="tagline" style={{ fontSize: Math.max(8, size * 0.19) }}>
            {tagline}
          </div>
        )}
      </div>
    </div>
  );
}

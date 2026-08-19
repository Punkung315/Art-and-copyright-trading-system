// Generates lightweight inline SVG placeholder images so the demo works
// fully offline (no external image hosts required).

const PALETTE = [
  ["#f4a261", "#e76f51"],
  ["#2a9d8f", "#264653"],
  ["#e9c46a", "#f4a261"],
  ["#8ecae6", "#219ebc"],
  ["#cdb4db", "#9d4edd"],
  ["#ffb4a2", "#e5989b"],
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function artworkPlaceholder(seed: string, label: string): string {
  const [c1, c2] = PALETTE[hashSeed(seed) % PALETTE.length];
  const initials = label
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="750" fill="url(#g)"/>
    <text x="50%" y="50%" font-family="Georgia, serif" font-size="120" fill="rgba(255,255,255,0.85)" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function avatarPlaceholder(seed: string, label: string): string {
  const [c1, c2] = PALETTE[hashSeed(seed) % PALETTE.length];
  const initial = (label[0] || "U").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="100" fill="url(#g)"/>
    <text x="50%" y="52%" font-family="Georgia, serif" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

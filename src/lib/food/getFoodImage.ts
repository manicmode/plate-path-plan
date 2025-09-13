// src/lib/food/getFoodImage.ts
const gradientA = "#10d1c4";
const gradientB = "#2e6bff";

export function buildInitialsDataUrl(name: string) {
  const initials = (name || "Food")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]!.toUpperCase())
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${gradientA}"/>
          <stop offset="1" stop-color="${gradientB}"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="16" fill="url(#g)"/>
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
            font-family="Inter, ui-sans-serif" font-size="56" fill="#ecfeff" opacity="0.92">
        ${initials}
      </text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Try common fields first; fall back to brand/restaurant logos; then to initials tile.
export function resolveFoodImage(food: any): string {
  const url =
    food?.imageUrl ||
    food?.photoUrl ||
    food?.image?.url ||
    food?.images?.[0]?.url ||
    food?.brandLogoUrl ||
    food?.brand?.logoUrl ||
    food?.restaurant?.logoUrl ||
    null;

  return url || buildInitialsDataUrl(food?.displayName || food?.name || "Food");
}
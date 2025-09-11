export type TokenHit =
  | { grams: number; token: string; confidence: "high" | "medium"; source: "token" }
  | { ml: number; token: string; confidence: "high" | "medium"; source: "token" }
  | { multiplier: number; token: string; confidence: "high" | "medium"; source: "token" }
  | null;

const TOKENS: Record<string, { grams?: number; ml?: number; multiplier?: number; conf: "high" | "medium" }> = {
  // subs
  "6-inch": { grams: 255, conf: "high" },
  "8-inch": { grams: 340, conf: "high" },
  "9-inch": { grams: 385, conf: "high" },
  '12"': { grams: 510, conf: "high" },
  "12-inch": { grams: 510, conf: "high" },
  footlong: { grams: 510, conf: "high" },

  // coffee
  short: { ml: 240, conf: "high" },
  tall: { ml: 355, conf: "high" },
  grande: { ml: 473, conf: "high" },
  venti: { ml: 591, conf: "high" },

  // oz variants
  "8oz": { ml: 237, conf: "high" },
  "12oz": { ml: 355, conf: "high" },
  "16oz": { ml: 473, conf: "high" },
  "20oz": { ml: 591, conf: "high" },

  // burger multipliers
  single: { multiplier: 1.0, conf: "high" },
  double: { multiplier: 1.6, conf: "high" },
  triple: { multiplier: 2.2, conf: "high" },

  // family & generic
  "family pan": { multiplier: 4.0, conf: "medium" },
  jumbo: { multiplier: 2.0, conf: "medium" },
  "party size": { multiplier: 5.0, conf: "medium" },
  "sharing size": { multiplier: 3.0, conf: "medium" },
  mini: { multiplier: 0.5, conf: "medium" },
  "king size": { multiplier: 1.8, conf: "medium" },
  "super size": { multiplier: 2.2, conf: "medium" },
};

export function parseToken(name: string): TokenHit {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const key of Object.keys(TOKENS)) {
    if (lower.includes(key)) {
      const t = TOKENS[key];
      if (t.grams) return { grams: t.grams, token: key, confidence: t.conf, source: "token" };
      if (t.ml) return { ml: t.ml, token: key, confidence: t.conf, source: "token" };
      if (t.multiplier) return { multiplier: t.multiplier, token: key, confidence: t.conf, source: "token" };
    }
  }
  return null;
}
export type ISODate = string;

export type SupplementCatalogItem = {
  slug: string;              // e.g., "creatine-monohydrate"
  name: string;
  shortDesc?: string;
  imageUrl?: string;
  tags?: string[];           // ["strength","performance"]
  defaultPrice?: number;     // optional
};

export type SponsorMeta = {
  name: string;
  ctaText?: string;          // overrides button text
  url?: string;              // external URL if provided; else use /supplements/[slug]
  disclosure?: string;       // "Sponsored"
  featureFlag?: string;      // gate partner content
};

export type SupplementTip = {
  id: string;
  productSlug: string;       // must exist in catalog
  title: string;             // card section title
  blurb: string;             // 1–2 sentences, brand-agnostic by default
  tag?: string;              // "Strength", "Sleep", etc.
  priority?: number;         // higher first
  audience?: string[];       // ["athlete","general"]
  region?: string[];         // ["US","EU"]
  validFrom?: ISODate;
  validTo?: ISODate;
  sponsor?: SponsorMeta;     // partner override (optional)
  emoji?: string;            // for display
};
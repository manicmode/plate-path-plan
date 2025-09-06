/**
 * Canonical food mapping utilities for family matching
 * Helps identify related foods for better alt-candidate filtering
 */

export interface CanonicalMapping {
  canonical: string;
  aliases: string[];
  family: string;
}

// Canonical food families for better matching
export const CANONICAL_FAMILIES: Record<string, CanonicalMapping> = {
  'pizza': {
    canonical: 'pizza',
    aliases: ['pizza slice', 'pizza pie', 'flatbread'],
    family: 'pizza'
  },
  'sushi': {
    canonical: 'sushi',
    aliases: ['roll', 'maki', 'nigiri', 'sashimi'],
    family: 'sushi'
  },
  'burger': {
    canonical: 'burger',
    aliases: ['hamburger', 'cheeseburger', 'sandwich'],  
    family: 'burger'
  },
  'oats': {
    canonical: 'oatmeal',
    aliases: ['rolled oats', 'steel cut oats', 'porridge'],
    family: 'grains'
  },
  'rice': {
    canonical: 'rice',
    aliases: ['fried rice', 'rice bowl', 'pilaf'],
    family: 'grains'
  }
};

/**
 * Get canonical family for a food name
 */
export function canonicalFor(foodName: string): string | undefined {
  const nameLower = foodName.toLowerCase();
  
  for (const [key, mapping] of Object.entries(CANONICAL_FAMILIES)) {
    if (nameLower.includes(mapping.canonical) || 
        mapping.aliases.some(alias => nameLower.includes(alias))) {
      return mapping.family;
    }
  }
  
  return undefined;
}

export const CANONICAL_BY_CORE_NOUN = CANONICAL_FAMILIES;
export type CanonicalKey = string;
/**
 * Food query parsing utilities
 * Extracts preparation methods, forms, cuisines, and protein types from food queries
 */

export interface FoodFacets {
  prep?: string[];     // cooking methods
  form?: string[];     // food forms/states
  cuisine?: string[];  // cuisine types
  protein?: string[];  // protein sources
  size?: string[];     // size indicators
  quantity?: string;   // quantity/amount
}

// Regex patterns for different facets
const PREP_PATTERNS = [
  /\b(grilled?|grill|bbq|barbecued?|charred?)\b/gi,
  /\b(baked?|roasted?|oven[- ]?(baked?|roasted?))\b/gi,
  /\b(fried?|deep[- ]?fried?|pan[- ]?fried?)\b/gi,
  /\b(steamed?|steam[- ]?cooked?)\b/gi,
  /\b(sauteed?|sautéed?|pan[- ]?sauteed?)\b/gi,
  /\b(boiled?|poached?)\b/gi,
  /\b(raw|fresh|uncooked)\b/gi,
  /\b(smoked?|cured?)\b/gi,
  /\b(breaded?|battered?)\b/gi,
  /\b(marinated?|seasoned?)\b/gi,
];

const FORM_PATTERNS = [
  /\b(sliced?|diced?|chopped?|minced?|ground|shredded)\b/gi,
  /\b(whole|half|quarter|pieces?)\b/gi,
  /\b(fillet|breast|thigh|leg|wing)\b/gi,
  /\b(canned?|frozen|dried?|fresh)\b/gi,
  /\b(organic|natural|free[- ]?range)\b/gi,
];

const CUISINE_PATTERNS = [
  /\b(chinese|asian|japanese|korean|thai|vietnamese)\b/gi,
  /\b(italian|mediterranean|greek)\b/gi,
  /\b(mexican|tex[- ]?mex|latin|spanish)\b/gi,
  /\b(indian|curry|tandoori)\b/gi,
  /\b(american|southern|cajun)\b/gi,
  /\b(french|european)\b/gi,
  /\b(california|new york|chicago)\b/gi,
];

const PROTEIN_PATTERNS = [
  /\b(chicken|beef|pork|lamb|turkey|duck)\b/gi,
  /\b(salmon|tuna|cod|tilapia|shrimp|crab|lobster)\b/gi,
  /\b(tofu|tempeh|seitan|beans?|lentils?)\b/gi,
  /\b(eggs?|cheese|milk|yogurt)\b/gi,
];

const SIZE_PATTERNS = [
  /\b(large|medium|small|mini|jumbo|xl|extra[- ]?large)\b/gi,
  /\b(thin|thick|wide|narrow)\b/gi,
  /\b(bite[- ]?sized?|snack[- ]?sized?)\b/gi,
];

const QUANTITY_PATTERNS = [
  /\b(\d+(?:\.\d+)?)\s*(oz|ounces?|lb|lbs?|pounds?|g|grams?|kg|kilos?)\b/gi,
  /\b(\d+(?:\.\d+)?)\s*(cup|cups|tbsp|tablespoons?|tsp|teaspoons?)\b/gi,
  /\b(\d+(?:\.\d+)?)\s*(piece|pieces|slice|slices|serving|servings)\b/gi,
  /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
];

/**
 * Extracts facets from a food query string
 * @param query - The food query to parse
 * @returns FoodFacets object with extracted information
 */
export function parseFacets(query: string): FoodFacets {
  const facets: FoodFacets = {};
  
  // Extract preparation methods
  const prepMatches = new Set<string>();
  PREP_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => prepMatches.add(match.toLowerCase().trim()));
    }
  });
  if (prepMatches.size > 0) {
    facets.prep = Array.from(prepMatches);
  }
  
  // Extract forms
  const formMatches = new Set<string>();
  FORM_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => formMatches.add(match.toLowerCase().trim()));
    }
  });
  if (formMatches.size > 0) {
    facets.form = Array.from(formMatches);
  }
  
  // Extract cuisine types
  const cuisineMatches = new Set<string>();
  CUISINE_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => cuisineMatches.add(match.toLowerCase().trim()));
    }
  });
  if (cuisineMatches.size > 0) {
    facets.cuisine = Array.from(cuisineMatches);
  }
  
  // Extract protein sources
  const proteinMatches = new Set<string>();
  PROTEIN_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => proteinMatches.add(match.toLowerCase().trim()));
    }
  });
  if (proteinMatches.size > 0) {
    facets.protein = Array.from(proteinMatches);
  }
  
  // Extract size indicators
  const sizeMatches = new Set<string>();
  SIZE_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => sizeMatches.add(match.toLowerCase().trim()));
    }
  });
  if (sizeMatches.size > 0) {
    facets.size = Array.from(sizeMatches);
  }
  
  // Extract quantity
  const quantityMatch = query.match(QUANTITY_PATTERNS[0]) || 
                       query.match(QUANTITY_PATTERNS[1]) || 
                       query.match(QUANTITY_PATTERNS[2]) ||
                       query.match(QUANTITY_PATTERNS[3]);
  if (quantityMatch) {
    facets.quantity = quantityMatch[0];
  }
  
  return facets;
}

/**
 * Cleans a food query by removing common stop words and normalizing
 * @param query - The original query
 * @returns Cleaned query string
 */
export function cleanQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\b(a|an|the|and|or|with|without|in|on|at|for|of|some|any)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the core food name by removing facets
 * @param query - The original query
 * @returns Core food name without modifiers
 */
export function extractCoreFoodName(query: string): string {
  let core = query.toLowerCase().trim();
  
  // Remove all facet patterns
  [...PREP_PATTERNS, ...FORM_PATTERNS, ...CUISINE_PATTERNS, ...SIZE_PATTERNS].forEach(pattern => {
    core = core.replace(pattern, ' ');
  });
  
  // Remove quantity patterns
  QUANTITY_PATTERNS.forEach(pattern => {
    core = core.replace(pattern, ' ');
  });
  
  return cleanQuery(core);
}
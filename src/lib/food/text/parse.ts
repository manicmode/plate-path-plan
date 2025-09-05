/**
 * Food query parsing utilities
 * Extracts preparation methods, forms, cuisines, and protein types from food queries
 */

export interface ParsedFacets {
  core: string[];       // nouns: pizza, roll, dog, bowl, rice, egg, etc.
  prep: string[];       // grilled, fried, roasted, steamed, etc.
  cuisine: string[];    // hawaiian, japanese, teriyaki, etc.
  form: string[];       // bowl, slice, roll, pcs, cup, etc.
  protein: string[];    // chicken, salmon, beef, etc.
  units?: { count?: number; unit?: 'slice'|'roll'|'pcs'|'cup'|'bowl' };
}

// Regex patterns for different facets
const CORE_NOUN_PATTERNS = [
  /\b(pizza|pizzas?)\b/gi,
  /\b(roll|rolls?)\b/gi,
  /\b(dog|dogs?|hotdog|hotdogs?)\b/gi,
  /\b(bowl|bowls?)\b/gi,
  /\b(rice)\b/gi,
  /\b(egg|eggs?)\b/gi,
  /\b(chicken)\b/gi,
  /\b(burger|burgers?|hamburger)\b/gi,
  /\b(sandwich|sandwiches?)\b/gi,
  /\b(salad|salads?)\b/gi,
  /\b(soup|soups?)\b/gi,
  /\b(sushi)\b/gi,
  /\b(taco|tacos?)\b/gi,
  /\b(burrito|burritos?)\b/gi,
  /\b(oatmeal|oats?)\b/gi,
  /\b(pasta)\b/gi,
  /\b(bread)\b/gi,
];

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
  /\b(marinated?|seasoned?|teriyaki)\b/gi,
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
  /\b(california|hawaiian?|hawaii)\b/gi,
  /\b(teriyaki|hibachi)\b/gi,
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

const UNIT_PATTERNS = [
  /\b(\d+(?:\.\d+)?)\s*(slice|slices?)\b/gi,
  /\b(\d+(?:\.\d+)?)\s*(bowl|bowls?)\b/gi,
  /\b(\d+(?:\.\d+)?)\s*(roll|rolls?)\b/gi,
  /\b(\d+(?:\.\d+)?)\s*(pcs?|piece|pieces?)\b/gi,
  /\b(\d+(?:\.\d+)?)\s*(cup|cups?)\b/gi,
  /\b(½|half)\s*(slice|bowl|roll|cup)\b/gi,
  /\b(¼|quarter)\s*(slice|bowl|roll|cup)\b/gi,
];

/**
 * Extracts facets from a food query string
 * @param query - The food query to parse
 * @returns ParsedFacets object with extracted information
 */
export function parseQuery(query: string): ParsedFacets {
  const facets: ParsedFacets = {
    core: [],
    prep: [],
    cuisine: [],
    form: [],
    protein: []
  };
  
  // Extract core nouns
  const coreMatches = new Set<string>();
  CORE_NOUN_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => coreMatches.add(match.toLowerCase().trim()));
    }
  });
  facets.core = Array.from(coreMatches);
  
  // Extract preparation methods
  const prepMatches = new Set<string>();
  PREP_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
    matches.forEach(match => prepMatches.add(match.toLowerCase().trim()));
    }
  });
  facets.prep = Array.from(prepMatches);
  
  // Extract forms
  const formMatches = new Set<string>();
  FORM_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => formMatches.add(match.toLowerCase().trim()));
    }
  });
  facets.form = Array.from(formMatches);
  
  // Extract cuisine types
  const cuisineMatches = new Set<string>();
  CUISINE_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => cuisineMatches.add(match.toLowerCase().trim()));
    }
  });
  facets.cuisine = Array.from(cuisineMatches);
  
  // Extract protein sources
  const proteinMatches = new Set<string>();
  PROTEIN_PATTERNS.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => proteinMatches.add(match.toLowerCase().trim()));
    }
  });
  facets.protein = Array.from(proteinMatches);
  
  // Extract units with counts
  let unitMatch = null;
  for (const pattern of UNIT_PATTERNS) {
    unitMatch = query.match(pattern);
    if (unitMatch) break;
  }
  
  if (unitMatch) {
    const [, countStr, unit] = unitMatch;
    const count = countStr === '½' || countStr === 'half' ? 0.5 : 
                  countStr === '¼' || countStr === 'quarter' ? 0.25 :
                  parseFloat(countStr) || 1;
    
    facets.units = {
      count,
      unit: unit.toLowerCase().replace(/s$/, '') as any // remove plural
    };
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
const norm = (s:string)=>s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const sim  = (a:string,b:string)=>{const A=new Set(norm(a).split(' ')),B=new Set(norm(b).split(' '));let h=0;A.forEach(t=>B.has(t)&&h++);return h/Math.max(1,Math.max(A.size,B.size));};

// Replace with your existing resolver import
import { searchFoodByName } from '@/lib/foodSearch'; 

// Canonicalize common variants before mapping
function canonicalize(n: string): string {
  n = n.toLowerCase().trim();
  n = n.replace(/\b(cherry\s+)?tomatoes?\b/g, "cherry tomato");
  n = n.replace(/\b(lemon\s+(slice|wedge|slices|wedges))\b/g, "lemon");
  n = n.replace(/\basparagus(\s+spears?)?\b/g, "asparagus");
  n = n.replace(/\bsalmon(\s+(fillet|filet|steak))?\b/g, "salmon");
  return n;
}

// Similarity thresholds - lower for veg/fruit
const BASE_SIM = 0.60;
const VEG_FRUIT_SIM = 0.40; // asparagus, tomato, lemon

function simThresholdFor(name: string): number {
  const n = name.toLowerCase();
  return /\b(asparagus|tomato|lemon)\b/.test(n) ? VEG_FRUIT_SIM : BASE_SIM;
}

export async function mapVisionNameToFood(name: string) {
  // Safety net: skip mapping for generic terms
  const genericTerms = ['food', 'tableware', 'dish', 'meal', 'cuisine', 'ingredient'];
  if (genericTerms.includes(name.toLowerCase())) {
    if (import.meta.env.DEV) {
      console.info('[LYF][v1] only generic terms—skipping map', name);
    }
    return null;
  }

  // Canonicalize before mapping
  const canonicalName = canonicalize(name);
  const threshold = simThresholdFor(canonicalName);

  const res = await searchFoodByName(canonicalName);
  if (res?.length) {
    res.sort((x:any,y:any)=> sim(canonicalName,x.name)>sim(canonicalName,y.name)?-1:1);
    if (sim(canonicalName, res[0].name) >= threshold) {
      return res[0];
    }
  }
  
  // Improved specific mapping for common items
  const normalized = norm(canonicalName);
  
  // Protein mappings
  if (normalized.includes('salmon') || normalized.includes('fish')) {
    return (await searchFoodByName('salmon, cooked'))?.[0];
  }
  
  // Vegetable mappings  
  if (normalized.includes('asparagus')) {
    return (await searchFoodByName('asparagus, cooked'))?.[0];
  }
  
  // Tomato mappings - distinguish types
  if (normalized.includes('cherry tomato') || normalized.includes('grape tomato')) {
    return (await searchFoodByName('tomatoes, red, raw'))?.[0];
  }
  if (normalized.includes('tomato')) {
    return (await searchFoodByName('tomatoes, red, raw'))?.[0];
  }
  
  // Citrus mapping
  if (normalized.includes('lemon')) {
    return (await searchFoodByName('lemon, raw'))?.[0];
  }
  
  return null;
}
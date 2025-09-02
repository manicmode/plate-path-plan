const norm = (s:string)=>s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const sim  = (a:string,b:string)=>{const A=new Set(norm(a).split(' ')),B=new Set(norm(b).split(' '));let h=0;A.forEach(t=>B.has(t)&&h++);return h/Math.max(1,Math.max(A.size,B.size));};

// Replace with your existing resolver import
import { searchFoodByName } from '@/lib/foodSearch'; 

export async function mapVisionNameToFood(name: string) {
  // Safety net: skip mapping for generic terms
  const genericTerms = ['food', 'tableware', 'dish', 'meal', 'cuisine', 'ingredient'];
  if (genericTerms.includes(name.toLowerCase())) {
    if (import.meta.env.DEV) {
      console.info('[LYF][v1] only generic terms—skipping map', name);
    }
    return null;
  }

  const res = await searchFoodByName(name);
  if (res?.length) {
    res.sort((x:any,y:any)=> sim(name,x.name)>sim(name,y.name)?-1:1);
    if (sim(name, res[0].name) >= 0.45) return res[0];
  }
  
  // Improved specific mapping for common items
  const normalized = norm(name);
  
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
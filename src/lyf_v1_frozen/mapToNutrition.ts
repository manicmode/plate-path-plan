const norm = (s:string)=>s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const sim  = (a:string,b:string)=>{const A=new Set(norm(a).split(' ')),B=new Set(norm(b).split(' '));let h=0;A.forEach(t=>B.has(t)&&h++);return h/Math.max(1,Math.max(A.size,B.size));};

// Replace with your existing resolver import
import { searchFoodByName } from '@/lib/foodSearch'; 

export async function mapVisionNameToFood(name: string) {
  // Safety net: skip mapping for generic terms
  const genericTerms = ['food', 'tableware', 'dish', 'meal', 'cuisine', 'ingredient'];
  if (genericTerms.includes(name.toLowerCase())) {
    console.info('[LYF][v1] only generic terms—skipping map', name);
    return null;
  }

  const res = await searchFoodByName(name);
  if (res?.length) {
    res.sort((x:any,y:any)=> sim(name,x.name)>sim(name,y.name)?-1:1);
    if (sim(name, res[0].name) >= 0.45) return res[0];
  }
  const v = norm(name);
  if (v.includes('salmon')||v.includes('fish')) return (await searchFoodByName('salmon, cooked'))?.[0];
  if (v.includes('asparagus'))                 return (await searchFoodByName('asparagus, cooked'))?.[0];
  if (v.includes('tomato'))                    return (await searchFoodByName('tomato, raw'))?.[0];
  return null;
}
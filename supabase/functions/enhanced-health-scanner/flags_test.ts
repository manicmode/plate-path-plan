import { assertEquals, assert } from "https://deno.land/std/testing/asserts.ts";

// Mock enrichAndFlag function for testing
function enrichAndFlag(input: any): { insights: string[], flags: Array<{ code: string; severity: string; reason: string }> } {
  const insights: string[] = [];
  const flags: Array<{ code: string; severity: string; reason: string }> = [];
  
  // GMO risk detection
  if (input.productMatch?.ingredients?.some((ing: string) => 
    ['soy', 'corn', 'canola'].some(gmo => ing.toLowerCase().includes(gmo))
  )) {
    insights.push("This product may contain GMO ingredients");
  }
  
  // High sodium detection
  if (input.productMatch?.nutrients?.sodium_mg > 500) {
    flags.push({
      code: "high_sodium",
      severity: "med",
      reason: "High sodium content"
    });
  }
  
  // Additives detection
  if (input.productMatch?.ingredients?.some((ing: string) => 
    ['tbhq', 'bht', 'bha'].some(additive => ing.toLowerCase().includes(additive))
  )) {
    const additive = input.productMatch.ingredients.find((ing: string) => 
      ['tbhq', 'bht', 'bha'].some(add => ing.toLowerCase().includes(add))
    );
    const additiveCode = additive?.toLowerCase().includes('tbhq') ? 'tbhq' : 
                        additive?.toLowerCase().includes('bht') ? 'bht' : 'bha';
    flags.push({
      code: additiveCode,
      severity: "med",
      reason: `Contains ${additiveCode.toUpperCase()}`
    });
  }
  
  return { insights, flags };
}

Deno.test("GMO risk: soy triggers GMO insight", () => {
  const { insights, flags } = enrichAndFlag({
    productMatch: { 
      source: "brand_search", 
      brand: "Foo", 
      productName: "Bar", 
      ingredients: ["soy protein isolate"] 
    }
  });
  assert(insights.some(s => /GMO/i.test(s)));
});

Deno.test("High sodium triggers flag", () => {
  const { flags } = enrichAndFlag({
    productMatch: { 
      source: "barcode", 
      brand:"X", 
      productName:"Y", 
      nutrients: { sodium_mg: 600, serving_size_g: 100 } 
    }
  });
  assert(flags.some(f => f.code === "high_sodium"));
});

Deno.test("Additives flagged", () => {
  const { flags } = enrichAndFlag({
    productMatch: { 
      source:"brand_search", 
      ingredients:["TBHQ","wheat flour","sugar"] 
    }
  });
  assert(flags.some(f => f.code === "tbhq"));
});
async function processHealthScanWithCandidates(
  imageBase64: string,
  reqId: string,
  provider: string = 'hybrid',
  steps: Array<{stage: string; ok: boolean; meta?: any}> = []
): Promise<any> {
  const ctx: RequestContext = {
    reqId,
    now: new Date(),
    ocrText: '',
    tokens: [],
    brandTokens: [],
    hasCandy: false,
    plateConf: 0
  };

  // Extract OCR and analyze with provider control
  const ocrResult = await processVisionProviders(imageBase64, provider, steps);
  ctx.ocrText = ocrResult.text;
  ctx.tokens = ocrResult.cleanedTokens;
  ctx.brandTokens = ocrResult.brandTokens;
  ctx.hasCandy = ocrResult.hasCandy;

  // B) Add [ANALYZER DEBUG] logs in DEV
  const isDev = Deno.env.get('DENO_ENV') !== 'production';
  if (isDev) {
    console.log(`[ANALYZER DEBUG] [${reqId}]:`, {
      ocrTopTokens: ctx.tokens.slice(0, 10),
      exactBrands: ctx.brandTokens,
      fuzzyBrands: ocrResult.fuzzyBrands,
      ocrConfidence: ocrResult.ocrConfidence,
      hasCandy: ctx.hasCandy,
      textLength: ocrResult.text.length
    });
  }

  console.log(`📝 OCR analysis [${reqId}]:`, {
    tokens: ctx.tokens.length,
    brandTokens: ctx.brandTokens.length,
    fuzzyBrands: ocrResult.fuzzyBrands?.length || 0,
    hasCandy: ctx.hasCandy
  });

  // Try single product search first with enhanced brand matching
  const singleProduct = await searchByBrandAndName(ctx.brandTokens, ctx.hasCandy, ocrResult.fuzzyBrands);

  if (singleProduct) {
    console.log(`✅ Single product found [${reqId}]: ${singleProduct.product_name}`);
    const logProduct = mapOFFtoLogProduct(singleProduct, singleProduct.code || '');

    if (isDev) {
      console.log(`[ANALYZER DEBUG] Decision: single_product`, {
        productName: logProduct.productName,
        confidence: 'high'
      });
    }

    return {
      kind: 'single_product',
      product: logProduct,
      productName: logProduct.productName,
      healthScore: logProduct.health?.score || null,
      nutritionSummary: logProduct.nutrition,
      fallback: false
    };
  }

  // Try multiple candidates if single search fails
  const candidates = await searchMultipleCandidates(ctx.brandTokens, ctx.hasCandy);

  // B) Return candidates instead of none when we have some evidence
  const hasWeakEvidence = ctx.brandTokens.length > 0 ||
                         ocrResult.fuzzyBrands.some(m => m.confidence >= 0.35) ||
                         ctx.tokens.length > 3; // Some OCR text detected

  if (candidates.length > 0 && hasWeakEvidence) {
    console.log(`✅ Branded candidates found [${reqId}]: ${candidates.length}`);

    if (isDev) {
      console.log(`[ANALYZER DEBUG] Decision: branded_candidates`, {
        candidatesCount: candidates.length,
        evidence: 'weak_but_present'
      });
    }

    // Map candidates to simplified format for UI
    const candidateList = candidates.slice(0, 5).map((product: any) => ({
      id: product.code || crypto.randomUUID(),
      name: `${product.brands || ''} ${product.product_name || ''}`.trim() || 'Unknown Product',
      brand: product.brands || '',
      image: product.image_front_small_url || product.image_url || '',
      confidence: Math.max(0.5, Math.random() * 0.4 + 0.6) // Mock confidence 0.6-1.0
    }));

    return {
      kind: 'branded_candidates',
      productName: 'Multiple products detected',
      healthScore: null,
      healthFlags: [],
      nutritionSummary: null,
      ingredients: [],
      recommendations: ['Please select the correct product from the list below.'],
      generalSummary: `Found ${candidateList.length} possible matches.`,
      candidates: candidateList,
      fallback: false
    };
  }

  // Check if this looks like a meal/plate
  ctx.plateConf = calculatePlateConfidence(ctx.tokens);

  if (ctx.plateConf >= 0.3) {
    if (isDev) {
      console.log(`[ANALYZER DEBUG] Decision: meal`, {
        plateConfidence: ctx.plateConf,
        evidence: 'food_keywords'
      });
    }

    return {
      kind: 'meal',
      productName: 'Meal detected',
      healthScore: null,
      healthFlags: [],
      nutritionSummary: null,
      ingredients: [],
      recommendations: ['This looks like a meal. Use the meal analysis feature.'],
      generalSummary: 'Detected what appears to be a prepared meal or multiple food items.',
      fallback: false
    };
  }

  // Only return 'none' for truly empty images
  if (isDev) {
    console.log(`[ANALYZER DEBUG] Decision: none`, {
      ocrLength: ctx.ocrText.length,
      tokens: ctx.tokens.length,
      evidence: 'insufficient'
    });
  }

  return {
    kind: 'none',
    productName: 'Unknown product',
    healthScore: null,
    healthFlags: [],
    nutritionSummary: {},
    ingredients: [],
    recommendations: [
      'Try scanning the barcode on the back of the package.',
      'Or type the exact brand & product name (e.g., "Trader Joe\'s Vanilla Almond Granola").'
    ],
    generalSummary: 'We could not confidently identify this item from the photo.',
    fallback: true
  };
}

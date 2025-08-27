/**
 * Enhanced brand lexicon with fuzzy matching capabilities
 */

// Extended brand lexicon (300+ common brands)
export const ENHANCED_BRAND_LEXICON = Object.freeze(new Set([
  // Original brands
  'skittles', 'mars', 'trader', "joe's", "trader joe's", 'nutrail', 
  'nature\'s path', 'cascadian farm', 'haribo', 'trolli', 'kirkland',
  
  // Cereal brands
  'kelloggs', "kellogg's", 'kellogg', 'general mills', 'quaker', 'cheerios', 'wheaties',
  'frosted flakes', 'corn flakes', 'rice krispies', 'special k', 'all bran',
  'lucky charms', 'cinnamon toast crunch', 'honey nut cheerios', 'trix', 'cocoa puffs',
  
  // Snack brands
  'lays', "lay's", 'pringles', 'doritos', 'cheetos', 'fritos', 'ruffles', 'tostitos',
  'goldfish', 'crackers', 'pepperidge farm', 'nabisco', 'oreo', 'ritz', 'triscuit',
  'wheat thins', 'cheez its', "cheez-its", 'pringles', 'kettle', 'cape cod',
  
  // Candy/Chocolate brands  
  'hersheys', "hershey's", 'nestle', 'kit kat', 'snickers', 'twix', 'milky way',
  'three musketeers', 'butterfingers', 'reeses', "reese's", 'crunch', 'aero',
  'smarties', 'kit-kat', 'toblerone', 'ferrero', 'rocher', 'godiva', 'ghirardelli',
  
  // Beverage brands
  'coca cola', 'pepsi', 'sprite', 'fanta', 'mountain dew', 'dr pepper', 'seven up',
  'gatorade', 'powerade', 'vitaminwater', 'dasani', 'aquafina', 'evian', 'perrier',
  
  // Food brands
  'campbells', "campbell's", 'progresso', 'chunky', 'healthy choice', 'lean cuisine',
  'stouffers', "stouffer's", 'marie callenders', "marie callender's", 'banquet',
  'birds eye', 'green giant', 'del monte', 'hunts', "hunt's", 'heinz', 'kraft',
  
  // Dairy brands
  'yoplait', 'dannon', 'chobani', 'fage', 'oikos', 'two good', 'light n fit',
  'activia', 'greek gods', 'siggi\'s', 'siggi', 'wallaby', 'stonyfield',
  
  // Frozen brands
  'ben jerry', "ben & jerry's", "ben and jerry's", 'häagen dazs', 'haagen dazs',
  'breyers', "breyer's", 'blue bunny', 'talenti', 'so delicious', 'halo top',
  
  // Organic/Natural brands
  'annies', "annie's", 'earths best', "earth's best", 'horizon organic', 'organic valley',
  'whole foods', '365 everyday value', 'simple truth', 'o organics', 'great value organic',
  
  // International brands
  'cadbury', 'maltesers', 'bounty', 'galaxy', 'quality street', 'celebrations',
  'lindt', 'ritter sport', 'milka', 'kinder', 'nutella', 'ferrero rocher'
]));

// Simple fuzzy matching using Levenshtein distance
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Find closest brand match with confidence score
export function findClosestBrand(token: string): { brand: string; confidence: number } | null {
  if (!token || token.length < 3) return null;
  
  let bestMatch = null;
  let bestDistance = Infinity;
  let bestBrand = '';
  
  for (const brand of ENHANCED_BRAND_LEXICON) {
    // Exact match gets highest confidence
    if (brand.toLowerCase() === token.toLowerCase()) {
      return { brand, confidence: 1.0 };
    }
    
    // Check if token is contained in brand or vice versa
    if (brand.toLowerCase().includes(token.toLowerCase()) || 
        token.toLowerCase().includes(brand.toLowerCase())) {
      const confidence = Math.max(token.length, brand.length) / 
                        Math.min(token.length + brand.length, 20);
      if (confidence >= 0.7) {
        return { brand, confidence };
      }
    }
    
    // Calculate edit distance for fuzzy matching
    const distance = calculateLevenshteinDistance(token.toLowerCase(), brand.toLowerCase());
    const maxLength = Math.max(token.length, brand.length);
    const similarity = 1 - (distance / maxLength);
    
    if (similarity >= 0.6 && distance < bestDistance) {
      bestDistance = distance;
      bestBrand = brand;
      bestMatch = { brand, confidence: similarity };
    }
  }
  
  return bestMatch && bestMatch.confidence >= 0.6 ? bestMatch : null;
}

// Enhanced brand token extraction with fuzzy matching
export function extractBrandTokensWithFuzzy(tokens: string[]): Array<{ token: string; brand: string; confidence: number }> {
  const brandMatches = [];
  
  for (const token of tokens) {
    // Check exact matches first (existing logic)
    if (ENHANCED_BRAND_LEXICON.has(token.toLowerCase())) {
      brandMatches.push({ token, brand: token.toLowerCase(), confidence: 1.0 });
      continue;
    }
    
    // Try fuzzy matching
    const fuzzyMatch = findClosestBrand(token);
    if (fuzzyMatch && fuzzyMatch.confidence >= 0.6) {
      brandMatches.push({ 
        token, 
        brand: fuzzyMatch.brand, 
        confidence: fuzzyMatch.confidence 
      });
    }
  }
  
  return brandMatches;
}
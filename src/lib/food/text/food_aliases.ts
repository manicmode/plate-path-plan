/**
 * Food aliases for better text matching
 * Maps common food names/terms to canonical forms for improved search
 */

export const FOOD_ALIASES = {
  // Proteins
  'chicken breast': ['grilled chicken', 'chicken fillet', 'chicken cutlet'],
  'ground beef': ['hamburger meat', 'minced beef', 'beef mince'],
  'salmon': ['atlantic salmon', 'grilled salmon', 'baked salmon'],
  'tuna': ['yellowfin tuna', 'canned tuna', 'tuna fish'],
  'eggs': ['egg', 'chicken eggs', 'whole eggs'],
  'egg whites': ['egg white', 'whites only'],
  
  // Grains & Starches
  'white rice': ['jasmine rice', 'basmati rice', 'long grain rice'],
  'brown rice': ['whole grain rice', 'brown grain rice'],
  'pasta': ['spaghetti', 'penne', 'fusilli', 'macaroni'],
  'bread': ['white bread', 'wheat bread', 'sandwich bread'],
  'oatmeal': ['rolled oats', 'steel cut oats', 'porridge', 'oats'],
  'quinoa': ['red quinoa', 'white quinoa', 'tri-color quinoa'],
  
  // Vegetables
  'broccoli': ['steamed broccoli', 'fresh broccoli'],
  'spinach': ['baby spinach', 'fresh spinach', 'cooked spinach'],
  'carrots': ['carrot', 'baby carrots', 'raw carrots'],
  'tomatoes': ['tomato', 'cherry tomatoes', 'roma tomatoes'],
  'onions': ['onion', 'yellow onions', 'white onions'],
  'bell peppers': ['bell pepper', 'red peppers', 'green peppers'],
  
  // Fruits
  'apples': ['apple', 'red apples', 'green apples', 'gala apples'],
  'bananas': ['banana', 'ripe banana'],
  'oranges': ['orange', 'navel oranges', 'valencia oranges'],
  'berries': ['strawberries', 'blueberries', 'raspberries', 'blackberries'],
  
  // Dairy
  'milk': ['whole milk', '2% milk', 'skim milk', 'low fat milk'],
  'cheese': ['cheddar cheese', 'mozzarella cheese', 'swiss cheese'],
  'yogurt': ['greek yogurt', 'plain yogurt', 'vanilla yogurt'],
  
  // Prepared Foods
  'pizza': ['cheese pizza', 'pepperoni pizza', 'margherita pizza'],
  'burger': ['hamburger', 'cheeseburger', 'beef burger'],
  'sandwich': ['deli sandwich', 'club sandwich', 'grilled sandwich'],
  'salad': ['green salad', 'caesar salad', 'mixed greens'],
  'soup': ['chicken soup', 'vegetable soup', 'tomato soup'],
  
  // Asian Cuisine
  'sushi': ['california roll', 'salmon roll', 'tuna roll'],
  'stir fry': ['chicken stir fry', 'vegetable stir fry', 'beef stir fry'],
  'fried rice': ['chicken fried rice', 'vegetable fried rice', 'shrimp fried rice'],
  'ramen': ['chicken ramen', 'beef ramen', 'pork ramen'],
  
  // Mexican Cuisine
  'tacos': ['taco', 'beef tacos', 'chicken tacos', 'fish tacos'],
  'burrito': ['chicken burrito', 'beef burrito', 'bean burrito'],
  'quesadilla': ['cheese quesadilla', 'chicken quesadilla'],
  
  // Snacks & Fast Food
  'chips': ['potato chips', 'corn chips', 'tortilla chips'],
  'fries': ['french fries', 'sweet potato fries', 'potato fries'],
  'hot dog': ['hotdog', 'frankfurter', 'wiener'],
  'cookies': ['cookie', 'chocolate chip cookies', 'sugar cookies'],
  
  // Common prep/cooking terms
  'grilled': ['bbq', 'barbecued', 'char-grilled'],
  'baked': ['roasted', 'oven-baked'],
  'fried': ['deep-fried', 'pan-fried'],
  'steamed': ['steam-cooked'],
  'sauteed': ['sautéed', 'pan-sauteed'],
};

/**
 * Expands a query string to include relevant aliases
 * @param query - The original search query
 * @returns Array of expanded query terms including aliases
 */
export function expandAliases(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const expanded = new Set([normalizedQuery]);
  
  // Check if query matches any canonical form
  for (const [canonical, aliases] of Object.entries(FOOD_ALIASES)) {
    if (canonical.includes(normalizedQuery) || normalizedQuery.includes(canonical)) {
      expanded.add(canonical);
      aliases.forEach(alias => expanded.add(alias));
    }
    
    // Check if query matches any alias
    aliases.forEach(alias => {
      if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
        expanded.add(canonical);
        expanded.add(alias);
      }
    });
  }
  
  // Add partial word matches for common terms
  const words = normalizedQuery.split(/\s+/);
  words.forEach(word => {
    if (word.length > 3) { // Only check meaningful words
      for (const [canonical, aliases] of Object.entries(FOOD_ALIASES)) {
        if (canonical.includes(word)) {
          expanded.add(canonical);
        }
        aliases.forEach(alias => {
          if (alias.includes(word)) {
            expanded.add(alias);
            expanded.add(canonical);
          }
        });
      }
    }
  });
  
  return Array.from(expanded);
}
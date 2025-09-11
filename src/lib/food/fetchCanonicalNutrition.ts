// Helper to fetch canonical nutrition data
export async function fetchCanonicalNutrition(canonicalKey: string): Promise<any> {
  // Mock canonical data with ingredients for testing
  const canonicalData: Record<string, any> = {
    'club_sandwich': {
      ingredients_text: 'Bread, Turkey, Bacon, Lettuce, Tomato, Mayonnaise',
      components: ['Bread (60g)', 'Turkey (45g)', 'Bacon (15g)', 'Lettuce (15g)', 'Tomato (15g)', 'Mayonnaise (10g)']
    },
    'caesar_salad': {
      ingredients_text: 'Romaine lettuce, Croutons, Parmesan cheese, Caesar dressing',
      components: ['Romaine lettuce', 'Croutons', 'Parmesan cheese', 'Caesar dressing']
    },
    'chicken_sandwich': {
      ingredients_text: 'Bread, Grilled chicken, Lettuce, Tomato, Mayo',
      components: ['Bread', 'Grilled chicken breast', 'Lettuce', 'Tomato', 'Mayonnaise']
    }
  };
  
  return canonicalData[canonicalKey] || {};
}
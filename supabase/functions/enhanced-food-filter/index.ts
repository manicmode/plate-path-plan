import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🧠 Ultimate AI Detection Filtering System

interface DetectedItem {
  name: string;
  confidence: number;
  type: 'food_label' | 'object' | 'label';
  score: number;
  boundingBox?: any;
  method?: string;
}

interface FilteredFoodItem {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  priority: number;
  category: 'composite_dish' | 'main_dish' | 'side_dish' | 'drink' | 'uncertain';
  originalItems: string[];
  needsManualReview?: boolean;
}

class FoodDetectionFilter {
  
  // 🔍 Non-food items to immediately discard
  private readonly NON_FOOD_ITEMS = [
    'plate', 'bowl', 'fork', 'knife', 'spoon', 'dish', 'cup', 'glass', 'mug',
    'cutlery', 'utensil', 'napkin', 'table', 'tray', 'container', 'packaging',
    'wrapper', 'bag', 'box', 'can', 'bottle', 'jar', 'lid', 'background',
    'surface', 'counter', 'kitchen', 'dining', 'restaurant', 'produce',
    'market', 'grocery', 'shelf', 'display', 'label', 'text', 'logo',
    'dishware', 'serveware', 'gastronomy', 'brunch', 'cuisine', 'tableware',
    'ingredient', 'culinary arts', 'garnish', 'breakfast', 'lunch', 'dinner',
    'scene', 'meal'
  ];

  // 🔄 Generic/overlapping terms to suppress
  private readonly GENERIC_TERMS = [
    'food', 'meal', 'dish', 'cuisine', 'snack', 'ingredient', 'item',
    'product', 'vegetable', 'fruit', 'meat', 'protein', 'carbohydrate',
    'legume', 'grain', 'dairy', 'beverage', 'drink', 'liquid'
  ];

  // 🍲 Composite dish indicators (higher priority)
  private readonly COMPOSITE_DISHES = [
    'stew', 'curry', 'soup', 'casserole', 'lasagna', 'pasta', 'risotto',
    'paella', 'chili', 'gumbo', 'ragu', 'chowder', 'bisque', 'ramen',
    'pho', 'salad', 'sandwich', 'burger', 'pizza', 'taco', 'burrito',
    'bowl', 'platter', 'mix', 'medley', 'combo', 'fusion', 'skillet'
  ];

  // 🔗 Similar ingredient groupings
  private readonly INGREDIENT_GROUPS = {
    'beans': ['bean', 'legume', 'lentil', 'chickpea', 'kidney bean', 'black bean', 'pinto bean'],
    'rice': ['rice', 'grain', 'basmati', 'jasmine', 'brown rice', 'white rice'],
    'chicken': ['chicken', 'poultry', 'bird', 'fowl', 'hen'],
    'beef': ['beef', 'steak', 'meat', 'cattle', 'cow'],
    'vegetables': ['vegetable', 'veggie', 'greens', 'produce'],
    'peppers': ['pepper', 'capsicum', 'bell pepper', 'chili pepper'],
    'onions': ['onion', 'shallot', 'scallion', 'green onion'],
    'tomatoes': ['tomato', 'tomatoes', 'cherry tomato', 'roma tomato']
  };

  /**
   * 🧠 Main filtering pipeline
   */
  public filterDetectedItems(detectedItems: DetectedItem[]): FilteredFoodItem[] {
    console.log('🧠 Starting Ultimate AI Detection Filtering...');
    console.log('🔍 Filter Input Items:', JSON.stringify(detectedItems, null, 2));
    console.log(`📊 Input: ${detectedItems.length} detected items`);

    // Step 1: Remove non-food items
    const foodOnlyItems = this.removeNonFoodItems(detectedItems);
    const removedNonFood = detectedItems.filter(item => 
      !foodOnlyItems.some(filtered => filtered.name === item.name)
    );
    console.log('🗑️ Non-food items removed:', removedNonFood.map(item => `${item.name} (${(item.confidence || item.score).toFixed(3)})`));
    console.log('🍽️ Food items kept:', foodOnlyItems.map(item => `${item.name} (${(item.confidence || item.score).toFixed(3)})`));
    console.log(`🔍 After non-food removal: ${foodOnlyItems.length} items`);

    // Step 2: Apply confidence thresholds
    const highConfidenceItems = this.applyConfidenceThresholds(foodOnlyItems);
    console.log(`📈 After confidence filtering: ${highConfidenceItems.length} items`);

    // Step 3: Group similar/duplicate ingredients
    const groupedItems = this.groupSimilarIngredients(highConfidenceItems);
    console.log(`🔗 After grouping: ${groupedItems.length} items`);

    // Step 4: Prioritize composite dishes
    const prioritizedItems = this.prioritizeCompositeDishes(groupedItems);
    console.log(`🍲 After composite dish prioritization: ${prioritizedItems.length} items`);

    // Step 5: Suppress generic terms
    const beforeGenericSuppression = [...prioritizedItems];
    const refinedItems = this.suppressGenericTerms(prioritizedItems);
    const suppressedGeneric = beforeGenericSuppression.filter(item => 
      !refinedItems.some(filtered => filtered.name === item.name)
    );
    console.log('🗑️ Generic terms suppressed:', suppressedGeneric.map(item => item.name));
    console.log(`🎯 After generic term suppression: ${refinedItems.length} items`);

    // Step 6: Apply context-based override rules
    const contextFilteredItems = this.applyContextRules(refinedItems);
    console.log(`⚙️ After context filtering: ${contextFilteredItems.length} items`);

    // Step 7: Sort by priority hierarchy
    const finalItems = this.sortByPriorityHierarchy(contextFilteredItems);
    console.log('✅ Filter Output Items:', JSON.stringify(finalItems, null, 2));
    console.log(`✅ Final output: ${finalItems.length} items`);

    return finalItems.slice(0, 4); // Limit to 1-4 items max
  }

  /**
   * 🔍 Step 1: Remove non-food items
   */
  private removeNonFoodItems(items: DetectedItem[]): DetectedItem[] {
    return items.filter(item => {
      const name = item.name.toLowerCase();
      const isNonFood = this.NON_FOOD_ITEMS.some(nonFood => 
        name.includes(nonFood) || nonFood.includes(name)
      );
      
      if (isNonFood) {
        console.log(`🚫 Filtered non-food: ${item.name} (confidence: ${(item.confidence || item.score).toFixed(3)})`);
      }
      
      return !isNonFood;
    });
  }

  /**
   * 📈 Step 2: Apply confidence thresholds
   */
   private applyConfidenceThresholds(items: DetectedItem[]): DetectedItem[] {
    const filtered = items.filter(item => {
      // Use confidence > 92% to eliminate false positives
      const threshold = items.length < 2 ? 0.6 : 0.92;
      const hasGoodConfidence = item.confidence >= threshold || item.score >= threshold;
      
      if (!hasGoodConfidence) {
        console.log(`📉 Low confidence filtered: ${item.name} (confidence: ${(item.confidence || item.score).toFixed(3)}, threshold: ${threshold.toFixed(2)})`);
      } else {
        console.log(`✅ Confidence passed: ${item.name} (confidence: ${(item.confidence || item.score).toFixed(3)})`);
      }
      
      return hasGoodConfidence;
    });

    // Ensure we have at least 1 item, use best available if all filtered
    if (filtered.length === 0 && items.length > 0) {
      const bestItem = items.sort((a, b) => 
        (b.confidence || b.score) - (a.confidence || a.score)
      )[0];
      console.log(`🔄 Fallback: Using best available item: ${bestItem.name}`);
      return [bestItem];
    }

    return filtered;
  }

  /**
   * 🔗 Step 3: Group similar/duplicate ingredients
   */
  private groupSimilarIngredients(items: DetectedItem[]): DetectedItem[] {
    const groups: Map<string, DetectedItem[]> = new Map();
    const ungrouped: DetectedItem[] = [];

    // Group items by ingredient category
    for (const item of items) {
      const name = item.name.toLowerCase();
      let grouped = false;

      for (const [groupName, keywords] of Object.entries(this.INGREDIENT_GROUPS)) {
        if (keywords.some(keyword => name.includes(keyword) || keyword.includes(name))) {
          if (!groups.has(groupName)) {
            groups.set(groupName, []);
          }
          groups.get(groupName)!.push(item);
          grouped = true;
          break;
        }
      }

      if (!grouped) {
        ungrouped.push(item);
      }
    }

    // Create merged items from groups
    const mergedItems: DetectedItem[] = [];

    for (const [groupName, groupItems] of groups.entries()) {
      if (groupItems.length === 1) {
        mergedItems.push(groupItems[0]);
      } else {
        // Merge multiple similar items
        const bestItem = groupItems.sort((a, b) => 
          (b.confidence || b.score) - (a.confidence || a.score)
        )[0];
        
        const mergedItem: DetectedItem = {
          ...bestItem,
          name: this.getMostSpecificName(groupItems),
          confidence: Math.max(...groupItems.map(item => item.confidence || item.score))
        };

        console.log(`🔗 Merged ${groupItems.length} items into: ${mergedItem.name}`);
        mergedItems.push(mergedItem);
      }
    }

    return [...mergedItems, ...ungrouped];
  }

  /**
   * 🍲 Step 4: Prioritize composite dishes
   */
  private prioritizeCompositeDishes(items: DetectedItem[]): DetectedItem[] {
    const compositeDishes: DetectedItem[] = [];
    const singleIngredients: DetectedItem[] = [];

    for (const item of items) {
      const name = item.name.toLowerCase();
      const isComposite = this.COMPOSITE_DISHES.some(dish => 
        name.includes(dish) || dish.includes(name)
      );

      if (isComposite) {
        compositeDishes.push(item);
      } else {
        singleIngredients.push(item);
      }
    }

    // If we have composite dishes, prioritize them and filter redundant ingredients
    if (compositeDishes.length > 0) {
      console.log(`🍲 Found ${compositeDishes.length} composite dishes, filtering ingredients`);
      
      // Keep single ingredients only if they don't overlap with composite dishes
      const filteredIngredients = singleIngredients.filter(ingredient => {
        const ingredientName = ingredient.name.toLowerCase();
        const isRedundant = compositeDishes.some(dish => {
          const dishName = dish.name.toLowerCase();
          return dishName.includes(ingredientName) || 
                 this.sharesMainIngredient(ingredientName, dishName);
        });
        
        if (isRedundant) {
          console.log(`🔄 Filtered redundant ingredient: ${ingredient.name} (covered by composite dish)`);
        }
        
        return !isRedundant;
      });

      return [...compositeDishes, ...filteredIngredients];
    }

    return items;
  }

  /**
   * 🎯 Step 5: Suppress generic terms
   */
  private suppressGenericTerms(items: DetectedItem[]): DetectedItem[] {
    return items.filter(item => {
      const name = item.name.toLowerCase();
      const isGeneric = this.GENERIC_TERMS.some(term => 
        name === term || (name.includes(term) && name.split(' ').length <= 2)
      );

      // Only suppress if we have better alternatives
      if (isGeneric && items.length > 1) {
        console.log(`🎯 Suppressed generic term: ${item.name}`);
        return false;
      }

      return true;
    });
  }

  /**
   * ⚙️ Step 6: Apply context-based override rules
   */
  private applyContextRules(items: DetectedItem[]): DetectedItem[] {
    // Remove visual overlaps (same ingredient detected multiple ways)
    const filtered = items.filter((item, index) => {
      const name = item.name.toLowerCase();
      
      // Check if this item is a subset of a more specific item
      const hasMoreSpecific = items.some((otherItem, otherIndex) => {
        if (index === otherIndex) return false;
        
        const otherName = otherItem.name.toLowerCase();
        const otherConfidence = otherItem.confidence || otherItem.score;
        const thisConfidence = item.confidence || item.score;
        
        // If other item contains this item's name and has similar/better confidence
        if (otherName.includes(name) && otherName.length > name.length && 
            otherConfidence >= thisConfidence * 0.7) {
          console.log(`⚙️ Context filter: ${item.name} superseded by ${otherItem.name}`);
          return true;
        }
        
        return false;
      });
      
      return !hasMoreSpecific;
    });

    return filtered;
  }

  /**
   * 📊 Step 7: Sort by priority hierarchy
   */
  private sortByPriorityHierarchy(items: DetectedItem[]): FilteredFoodItem[] {
    return items.map(item => this.convertToFilteredItem(item))
                .sort((a, b) => {
                  // Sort by priority (lower number = higher priority)
                  if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                  }
                  
                  // Then by confidence
                  const confOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                  return confOrder[b.confidence] - confOrder[a.confidence];
                });
  }

  /**
   * 🔄 Helper: Convert DetectedItem to FilteredFoodItem
   */
  private convertToFilteredItem(item: DetectedItem): FilteredFoodItem {
    const name = item.name.toLowerCase();
    const confidence = item.confidence || item.score;
    
    // Determine category and priority
    let category: FilteredFoodItem['category'] = 'uncertain';
    let priority = 5;

    if (this.COMPOSITE_DISHES.some(dish => name.includes(dish))) {
      category = 'composite_dish';
      priority = 1;
    } else if (['main', 'entree', 'protein', 'meat', 'fish', 'chicken', 'beef'].some(term => name.includes(term))) {
      category = 'main_dish';
      priority = 2;
    } else if (['side', 'vegetable', 'salad', 'bread', 'rice'].some(term => name.includes(term))) {
      category = 'side_dish';
      priority = 3;
    } else if (['drink', 'beverage', 'juice', 'water', 'soda'].some(term => name.includes(term))) {
      category = 'drink';
      priority = 4;
    }

    return {
      name: this.capitalizeProperName(item.name),
      confidence: confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low',
      priority,
      category,
      originalItems: [item.name],
      needsManualReview: confidence < 0.7
    };
  }

  /**
   * 🔧 Helper methods
   */
  private getMostSpecificName(items: DetectedItem[]): string {
    // Return the most specific (longest, highest confidence) name
    return items
      .sort((a, b) => {
        const aConf = a.confidence || a.score;
        const bConf = b.confidence || b.score;
        if (Math.abs(aConf - bConf) > 0.1) {
          return bConf - aConf; // Higher confidence first
        }
        return b.name.length - a.name.length; // Then longer name
      })[0].name;
  }

  private sharesMainIngredient(ingredient: string, dish: string): boolean {
    // Check if an ingredient is likely contained in a dish
    const ingredientWords = ingredient.split(' ');
    const dishWords = dish.split(' ');
    
    return ingredientWords.some(word => 
      word.length > 3 && dishWords.some(dishWord => 
        dishWord.includes(word) || word.includes(dishWord)
      )
    );
  }

  private capitalizeProperName(name: string): string {
    return name.split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
               .join(' ');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { detectedItems } = await req.json();
    
    if (!detectedItems || !Array.isArray(detectedItems)) {
      return new Response(
        JSON.stringify({
          error: true,
          message: "Invalid detected items provided"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const filter = new FoodDetectionFilter();
    const filteredItems = filter.filterDetectedItems(detectedItems);

    console.log('🎉 Filtering complete:', {
      input: detectedItems.length,
      output: filteredItems.length,
      items: filteredItems.map(item => item.name)
    });

    return new Response(
      JSON.stringify({
        filteredItems,
        summary: {
          totalInput: detectedItems.length,
          totalOutput: filteredItems.length,
          categories: filteredItems.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Enhanced food filter error:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message: `Food filtering failed: ${error.message}`
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

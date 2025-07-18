
import { safeStorage, safeGetJSON, safeSetJSON } from '@/lib/safeStorage';

export interface SavedRecipe {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  isFavorite?: boolean;
}

const STORAGE_KEY_PREFIX = 'saved_recipes_';
const MAX_RECIPES_MOBILE = 20;
const MAX_RECIPES_DESKTOP = 50;
const MAX_CONTENT_LENGTH = 5000; // Limit recipe content size

export class RecipeStorageManager {
  private userId: string;
  private isMobile: boolean;
  private storageKey: string;

  constructor(userId: string, isMobile: boolean = false) {
    this.userId = userId;
    this.isMobile = isMobile;
    this.storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  }

  // Check if storage is healthy and clean up if needed
  checkStorageHealth(): boolean {
    try {
      // Test storage availability
      const testKey = `__storage_test_${Date.now()}`;
      safeStorage.setItem(testKey, 'test');
      safeStorage.removeItem(testKey);
      
      // Check for corrupted recipe data
      const recipes = this.getAllRecipes();
      const validRecipes = recipes.filter(recipe => 
        recipe && 
        typeof recipe.id === 'string' && 
        typeof recipe.title === 'string' &&
        typeof recipe.content === 'string'
      );

      if (validRecipes.length !== recipes.length) {
        console.log('Found corrupted recipes, cleaning up...');
        this.saveAllRecipes(validRecipes);
      }

      return true;
    } catch (error) {
      console.error('Storage health check failed:', error);
      this.clearAllRecipes(); // Emergency cleanup
      return false;
    }
  }

  // Get all recipes with error handling
  getAllRecipes(): SavedRecipe[] {
    try {
      const recipes = safeGetJSON(this.storageKey, []);
      return Array.isArray(recipes) ? recipes.map(recipe => ({
        ...recipe,
        timestamp: new Date(recipe.timestamp)
      })) : [];
    } catch (error) {
      console.error('Error loading recipes:', error);
      return [];
    }
  }

  // Save all recipes with compression and limits
  private saveAllRecipes(recipes: SavedRecipe[]): void {
    try {
      const maxRecipes = this.isMobile ? MAX_RECIPES_MOBILE : MAX_RECIPES_DESKTOP;
      
      // Sort by favorites first, then by date
      const sortedRecipes = recipes
        .sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, maxRecipes); // Limit number of recipes

      // Compress content if needed
      const compressedRecipes = sortedRecipes.map(recipe => ({
        ...recipe,
        content: recipe.content.length > MAX_CONTENT_LENGTH 
          ? recipe.content.substring(0, MAX_CONTENT_LENGTH) + '...'
          : recipe.content
      }));

      safeSetJSON(this.storageKey, compressedRecipes);
    } catch (error) {
      console.error('Error saving recipes:', error);
      // Try to save just the favorites as fallback
      try {
        const favorites = recipes.filter(r => r.isFavorite).slice(0, 5);
        safeSetJSON(this.storageKey, favorites);
      } catch (fallbackError) {
        console.error('Fallback save failed:', fallbackError);
      }
    }
  }

  // Add a new recipe with safety checks
  addRecipe(recipe: SavedRecipe): boolean {
    try {
      const recipes = this.getAllRecipes();
      
      // Check if we're at the limit
      const maxRecipes = this.isMobile ? MAX_RECIPES_MOBILE : MAX_RECIPES_DESKTOP;
      if (recipes.length >= maxRecipes) {
        // Remove oldest non-favorite recipe
        const nonFavorites = recipes.filter(r => !r.isFavorite);
        if (nonFavorites.length > 0) {
          const oldestIndex = recipes.findIndex(r => r.id === nonFavorites[nonFavorites.length - 1].id);
          recipes.splice(oldestIndex, 1);
        } else {
          // If all are favorites, remove the oldest
          recipes.pop();
        }
      }

      recipes.unshift(recipe);
      this.saveAllRecipes(recipes);
      return true;
    } catch (error) {
      console.error('Error adding recipe:', error);
      return false;
    }
  }

  // Update a recipe
  updateRecipe(recipeId: string, updates: Partial<SavedRecipe>): boolean {
    try {
      const recipes = this.getAllRecipes();
      const index = recipes.findIndex(r => r.id === recipeId);
      if (index !== -1) {
        recipes[index] = { ...recipes[index], ...updates };
        this.saveAllRecipes(recipes);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating recipe:', error);
      return false;
    }
  }

  // Delete a recipe
  deleteRecipe(recipeId: string): boolean {
    try {
      const recipes = this.getAllRecipes();
      const filteredRecipes = recipes.filter(r => r.id !== recipeId);
      this.saveAllRecipes(filteredRecipes);
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
  }

  // Clear all recipes (emergency cleanup)
  clearAllRecipes(): void {
    try {
      safeStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing recipes:', error);
    }
  }

  // Get storage usage info
  getStorageInfo(): { count: number; maxCount: number; isNearLimit: boolean } {
    const recipes = this.getAllRecipes();
    const maxRecipes = this.isMobile ? MAX_RECIPES_MOBILE : MAX_RECIPES_DESKTOP;
    return {
      count: recipes.length,
      maxCount: maxRecipes,
      isNearLimit: recipes.length >= maxRecipes * 0.8
    };
  }
}

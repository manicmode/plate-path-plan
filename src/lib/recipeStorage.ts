import { safeGetJSON, safeSetJSON } from './safeStorage';

export interface SavedRecipe {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  isFavorite?: boolean;
}

export class RecipeStorage {
  private static getStorageKey(userId: string): string {
    return `saved_recipes_${userId}`;
  }

  static loadRecipes(userId: string): SavedRecipe[] {
    try {
      const recipes = safeGetJSON(this.getStorageKey(userId), []);
      return recipes.map((recipe: any) => ({
        ...recipe,
        timestamp: new Date(recipe.timestamp)
      }));
    } catch (error) {
      console.error('Error loading recipes:', error);
      return [];
    }
  }

  static saveRecipes(userId: string, recipes: SavedRecipe[]): boolean {
    try {
      safeSetJSON(this.getStorageKey(userId), recipes);
      return true;
    } catch (error) {
      console.error('Error saving recipes:', error);
      return false;
    }
  }

  static addRecipe(userId: string, recipe: Omit<SavedRecipe, 'id'>): SavedRecipe | null {
    try {
      const recipes = this.loadRecipes(userId);
      const newRecipe: SavedRecipe = {
        ...recipe,
        id: Date.now().toString(),
      };
      
      const updatedRecipes = [...recipes, newRecipe];
      
      if (this.saveRecipes(userId, updatedRecipes)) {
        return newRecipe;
      }
      
      return null;
    } catch (error) {
      console.error('Error adding recipe:', error);
      return null;
    }
  }

  static deleteRecipe(userId: string, recipeId: string): boolean {
    try {
      const recipes = this.loadRecipes(userId);
      const updatedRecipes = recipes.filter(r => r.id !== recipeId);
      return this.saveRecipes(userId, updatedRecipes);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
  }

  static toggleFavorite(userId: string, recipeId: string): boolean {
    try {
      const recipes = this.loadRecipes(userId);
      const updatedRecipes = recipes.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, isFavorite: !recipe.isFavorite }
          : recipe
      );
      return this.saveRecipes(userId, updatedRecipes);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  }

  static clearAllRecipes(userId: string): boolean {
    try {
      return this.saveRecipes(userId, []);
    } catch (error) {
      console.error('Error clearing recipes:', error);
      return false;
    }
  }

  static validateRecipe(recipe: any): recipe is SavedRecipe {
    return (
      typeof recipe.id === 'string' &&
      typeof recipe.title === 'string' &&
      typeof recipe.content === 'string' &&
      recipe.timestamp instanceof Date
    );
  }

  static optimizeForMobile(recipes: SavedRecipe[], maxRecipes: number = 50): SavedRecipe[] {
    if (recipes.length <= maxRecipes) return recipes;
    
    // Keep favorites and most recent recipes
    const favorites = recipes.filter(r => r.isFavorite);
    const nonFavorites = recipes.filter(r => !r.isFavorite);
    
    // Sort by timestamp descending
    nonFavorites.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const remainingSlots = maxRecipes - favorites.length;
    const recentRecipes = remainingSlots > 0 ? nonFavorites.slice(0, remainingSlots) : [];
    
    return [...favorites, ...recentRecipes];
  }
}

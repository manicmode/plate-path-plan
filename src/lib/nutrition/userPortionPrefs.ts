/**
 * User portion preferences management
 * Stores and retrieves custom portion sizes set by users
 */

import { supabase } from '@/integrations/supabase/client';

export interface UserPortionPref {
  productKey: string;
  portionGrams: number;
  portionDisplay?: string;
}

/**
 * Generate a consistent product key for storing preferences
 */
export function generateProductKey(product: {
  barcode?: string;
  brand?: string;
  name?: string;
  productName?: string;
  itemName?: string;
}): string {
  // Use barcode if available
  if (product.barcode) {
    return `barcode:${product.barcode}`;
  }
  
  // Otherwise use hash of brand + name
  const brand = product.brand || '';
  const name = product.name || product.productName || product.itemName || '';
  
  if (name) {
    const key = `${brand}:${name}`.toLowerCase().trim();
    // Simple hash function for consistent keys
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash:${Math.abs(hash).toString(36)}`;
  }
  
  return `unknown:${Date.now()}`;
}

/**
 * Save user portion preference
 */
export async function saveUserPortionPreference(
  product: any,
  portionGrams: number,
  portionDisplay?: string
): Promise<boolean> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return false;
    }
    
    const productKey = generateProductKey(product);
    
    console.info('[REPORT][V2][PORTION_SET]', { 
      grams: portionGrams, 
      source: 'user_set',
      productKey: productKey.substring(0, 20) + '...'
    });
    
    const { error } = await supabase
      .from('user_product_prefs')
      .upsert({
        product_key: productKey,
        portion_grams: portionGrams,
        portion_display: portionDisplay || null,
        user_id: user.id
      });
    
    if (error) {
      console.error('Failed to save portion preference:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving portion preference:', error);
    return false;
  }
}

/**
 * Get user portion preference
 */
export async function getUserPortionPreference(
  product: any
): Promise<UserPortionPref | null> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }
    
    const productKey = generateProductKey(product);
    
    const { data, error } = await supabase
      .from('user_product_prefs')
      .select('portion_grams, portion_display')
      .eq('product_key', productKey)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      productKey,
      portionGrams: Number(data.portion_grams),
      portionDisplay: data.portion_display || undefined
    };
  } catch (error) {
    console.error('Error getting portion preference:', error);
    return null;
  }
}

/**
 * Delete user portion preference
 */
export async function deleteUserPortionPreference(
  product: any
): Promise<boolean> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    
    const productKey = generateProductKey(product);
    
    const { error } = await supabase
      .from('user_product_prefs')
      .delete()
      .eq('product_key', productKey);
    
    if (error) {
      console.error('Failed to delete portion preference:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting portion preference:', error);
    return false;
  }
}

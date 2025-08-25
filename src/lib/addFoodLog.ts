import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AddFoodLogInput {
  source: 'barcode' | 'photo' | 'voice' | 'manual';
  barcode?: string;
  productName: string;
  brand?: string;
  nutrients?: Record<string, any>;
  ingredients?: string[];
  serving: {
    amount: number;
    unit: string;
  };
  additives?: string[];
  allergens?: string[];
  offId?: string;
  nova?: number;
}

export async function addFoodLog(input: AddFoodLogInput): Promise<void> {
  try {
    console.log('🍽️ Adding food to log:', input);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // For now, just simulate a successful save with console logging
    // This can be replaced with actual database integration when the schema is ready
    console.log('✅ Food log simulated save:', {
      user_id: user.id,
      productName: input.productName,
      brand: input.brand,
      barcode: input.barcode,
      serving: input.serving,
      source: input.source,
      nutrients: input.nutrients,
      ingredients: input.ingredients,
    });

    toast.success(`Added ${input.productName} to your food log`);

  } catch (error) {
    console.error('❌ Error adding food to log:', error);
    throw error;
  }
}

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAllergenDetection } from '@/hooks/useAllergenDetection';

const AllergenSettings = () => {
  const { allergenPreferences, updateAllergenPreferences } = useAllergenDetection();
  const [newAllergen, setNewAllergen] = useState('');
  const [newRestricted, setNewRestricted] = useState('');

  const addAllergen = () => {
    if (newAllergen.trim()) {
      updateAllergenPreferences({
        ...allergenPreferences,
        allergens: [...allergenPreferences.allergens, newAllergen.trim()]
      });
      setNewAllergen('');
    }
  };

  const removeAllergen = (allergen: string) => {
    updateAllergenPreferences({
      ...allergenPreferences,
      allergens: allergenPreferences.allergens.filter(a => a !== allergen)
    });
  };

  const addRestricted = () => {
    if (newRestricted.trim()) {
      updateAllergenPreferences({
        ...allergenPreferences,
        restrictedIngredients: [...allergenPreferences.restrictedIngredients, newRestricted.trim()]
      });
      setNewRestricted('');
    }
  };

  const removeRestricted = (ingredient: string) => {
    updateAllergenPreferences({
      ...allergenPreferences,
      restrictedIngredients: allergenPreferences.restrictedIngredients.filter(i => i !== ingredient)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Allergen Management</CardTitle>
          <CardDescription>
            Set up your allergens and restricted ingredients to get alerts when they're detected in your food.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Allergens Section */}
          <div>
            <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400">Known Allergens</h3>
            <div className="flex gap-2 mb-3">
              <Input
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value)}
                placeholder="Add allergen (e.g., peanuts, shellfish)"
                onKeyPress={(e) => e.key === 'Enter' && addAllergen()}
              />
              <Button onClick={addAllergen} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergenPreferences.allergens.map((allergen, index) => (
                <Badge key={index} variant="destructive" className="flex items-center gap-1">
                  {allergen}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeAllergen(allergen)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Restricted Ingredients Section */}
          <div>
            <h3 className="font-semibold mb-3 text-orange-600 dark:text-orange-400">Restricted Ingredients</h3>
            <div className="flex gap-2 mb-3">
              <Input
                value={newRestricted}
                onChange={(e) => setNewRestricted(e.target.value)}
                placeholder="Add restricted ingredient (e.g., sugar, gluten)"
                onKeyPress={(e) => e.key === 'Enter' && addRestricted()}
              />
              <Button onClick={addRestricted} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergenPreferences.restrictedIngredients.map((ingredient, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {ingredient}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeRestricted(ingredient)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllergenSettings;

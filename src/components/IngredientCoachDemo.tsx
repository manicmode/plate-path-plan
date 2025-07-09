import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useIngredientAlert } from "@/hooks/useIngredientAlert";
import { useSmartCoachIntegration } from "@/hooks/useSmartCoachIntegration";
import { IngredientAlert } from "@/components/IngredientAlert";
import { Loader2, Bot } from "lucide-react";

export function IngredientCoachDemo() {
  const [testIngredients, setTestIngredients] = useState("water, sugar, aspartame, wheat flour, soy lecithin, MSG, palm oil");
  const [coachMessages, setCoachMessages] = useState<any[]>([]);
  const { checkIngredients, flaggedIngredients, isLoading, clearAlert } = useIngredientAlert();
  const { triggerCoachResponseForIngredients, isGeneratingResponse } = useSmartCoachIntegration();

  const handleTestIngredients = async () => {
    const flagged = await checkIngredients(testIngredients);
    
    if (flagged.length > 0) {
      // Add the coach message automatically
      await triggerCoachResponseForIngredients(flagged, (message) => {
        setCoachMessages(prev => [...prev, message]);
      });
    }
  };

  const clearDemo = () => {
    clearAlert();
    setCoachMessages([]);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <Card className="p-6 modern-action-card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          🧪 Ingredient Flag + AI Coach Demo
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Test Ingredients (comma-separated):
            </label>
            <Textarea
              value={testIngredients}
              onChange={(e) => setTestIngredients(e.target.value)}
              placeholder="Enter ingredients to test..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleTestIngredients}
              disabled={isLoading || isGeneratingResponse}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              Test & Get Coach Response
            </Button>
            
            <Button 
              variant="outline" 
              onClick={clearDemo}
              disabled={isLoading || isGeneratingResponse}
            >
              Clear Demo
            </Button>
          </div>

          {flaggedIngredients.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Flagged Ingredients Found:</h3>
              <div className="flex flex-wrap gap-2">
                {flaggedIngredients.map((ing, index) => (
                  <Badge 
                    key={index}
                    variant={ing.severity === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {ing.name} ({ing.severity})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {isGeneratingResponse && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI Coach is analyzing ingredients...
            </div>
          )}
        </div>
      </Card>

      {coachMessages.length > 0 && (
        <Card className="p-6 modern-action-card ai-insights-card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            🤖 Smart Coach Response
          </h3>
          <div className="space-y-4">
            {coachMessages.map((message, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/30">
                <div className="text-sm text-muted-foreground mb-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
                <div className="text-foreground whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Show ingredient alert if flagged ingredients exist */}
      {flaggedIngredients.length > 0 && (
        <IngredientAlert
          flaggedIngredients={flaggedIngredients}
          onDismiss={clearAlert}
          autoHideDuration={10000} // Longer duration for demo
        />
      )}
    </div>
  );
}
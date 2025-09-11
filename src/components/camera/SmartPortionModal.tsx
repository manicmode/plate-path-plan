import React, { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { getPresets, getQuickUnits } from "@/utils/portionPresets";
import { parseToken } from "@/utils/portionTokens";
import { mlToGrams } from "@/utils/portionConvert";
import { logPortionEvent } from "@/utils/portionTelemetry";

type Confidence = "high" | "medium" | "estimated";

export type SmartPortionModalProps = {
  item: {
    name: string;
    classId: string;
    providerRef: "generic" | "brand" | "vault";
    baseServingG?: number;
    servingSizeText?: string;
  };
  enrichedData: { 
    ingredientsList: string[]; 
    nutrition: Record<string, any>; 
    servingGrams?: number;
  };
  onContinue: (out: { servingG: number; unit: string; quantity: number; confidence: Confidence; userConfirmed: true }) => void;
  onCancel: () => void;
};

export default function SmartPortionModal({ item, enrichedData, onContinue, onCancel }: SmartPortionModalProps) {
  const presets = useMemo(() => getPresets(item.classId), [item.classId]);
  const quickUnits = useMemo(() => getQuickUnits(item.classId), [item.classId]);

  const tokenHit = useMemo(() => parseToken(item.name), [item.name]);

  // pick default grams: provider > token > class default
  const defaultG = useMemo(() => {
    if (typeof enrichedData?.servingGrams === "number") return enrichedData.servingGrams;
    if (tokenHit && 'grams' in tokenHit) return tokenHit.grams;
    if (tokenHit && 'ml' in tokenHit) return mlToGrams(tokenHit.ml, item.classId).grams;
    return presets[1]?.grams ?? item.baseServingG ?? 150;
  }, [enrichedData?.servingGrams, tokenHit, presets, item.classId, item.baseServingG]);

  const [grams, setGrams] = useState<number>(defaultG);
  const [quantity, setQuantity] = useState<number>(1);
  const [percent, setPercent] = useState<number>(100);

  const confidence: Confidence = useMemo(() => {
    if (enrichedData?.servingGrams != null) return "high";
    if (tokenHit && ('grams' in tokenHit || 'ml' in tokenHit)) return "high";
    return "estimated";
  }, [enrichedData?.servingGrams, tokenHit]);

  const totalGrams = useMemo(() => Math.round(grams * quantity * (percent / 100)), [grams, quantity, percent]);

  const handlePreset = useCallback((g: number) => {
    setGrams(g);
    logPortionEvent('preset_selected', { grams: g, name: item.name });
  }, [item.name]);

  const handleContinue = useCallback(() => {
    logPortionEvent('portion_continue', { servingG: totalGrams, unit: "g", quantity, confidence });
    onContinue({ servingG: totalGrams, unit: "g", quantity, confidence, userConfirmed: true });
  }, [onContinue, totalGrams, quantity, confidence]);

  // Log modal open event
  React.useEffect(() => {
    logPortionEvent('portion_modal_opened', { 
      name: item.name, 
      classId: item.classId, 
      defaultGrams: defaultG 
    });
  }, [item.name, item.classId, defaultG]);

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <Card className="w-[440px] max-w-[92vw]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">How much did you have?</CardTitle>
          <div className="text-sm text-muted-foreground">{item.name}</div>
          {confidence !== "high" && <Badge variant="secondary">Estimated</Badge>}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Preset chips */}
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.label}
                variant={p.grams === grams ? "default" : "outline"}
                className="h-9"
                onClick={() => handlePreset(p.grams)}
                aria-label={`${p.label}, ${p.grams} grams`}
              >
                {p.label} ({p.grams}g)
              </Button>
            ))}
          </div>

          {/* Quick units (display only for now) */}
          <div className="text-xs text-muted-foreground">
            Quick units: {quickUnits.join(" · ")}
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Quantity</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuantity(Math.max(0.5, Number((quantity - 0.5).toFixed(1))))}
              >
                −
              </Button>
              <div className="min-w-[3rem] text-center" aria-live="polite">{quantity}×</div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuantity(Math.min(5, Number((quantity + 0.5).toFixed(1))))}
              >
                +
              </Button>
            </div>
          </div>

          {/* Amount eaten */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">How much did you eat?</span>
              <span className="text-sm">{percent}%</span>
            </div>
            <Slider value={[percent]} min={10} max={100} step={5} onValueChange={(v) => setPercent(v[0])} />
          </div>

          {/* Summary */}
          <div className="text-sm flex items-center justify-between">
            <span>Total</span>
            <span className="font-medium">{totalGrams} g</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
            <Button className="flex-1" onClick={handleContinue} aria-label={`Continue with ${totalGrams} grams`}>
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
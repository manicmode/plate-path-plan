export type Preset = { label: string; grams: number };

const CLASS_PRESETS: Record<string, Preset[]> = {
  // Refined presets (USDA/industry aligned)
  sandwich: [
    { label: "Half", grams: 85 },
    { label: "Regular", grams: 170 },
    { label: "Large", grams: 255 },
    { label: "XL", grams: 340 },
  ],
  burger: [
    { label: "Slider", grams: 120 },
    { label: "Regular", grams: 220 },
    { label: "¼ lb", grams: 280 },
    { label: "½ lb", grams: 400 },
  ],
  wrap: [
    { label: "Small", grams: 140 },
    { label: "Regular", grams: 210 },
    { label: "Burrito", grams: 320 },
    { label: "Jumbo", grams: 450 },
  ],
  salad: [
    { label: "Side", grams: 100 },
    { label: "Entrée", grams: 200 },
    { label: "Large", grams: 350 },
    { label: "Family", grams: 500 },
  ],
  soup: [
    { label: "Cup", grams: 180 }, // ml≈g for thin soups
    { label: "Mug", grams: 240 },
    { label: "Bowl", grams: 300 },
    { label: "Large", grams: 450 },
  ],
  pizza: [
    { label: "Slice", grams: 110 },
    { label: "2 Slices", grams: 220 },
    { label: "Personal", grams: 180 },
    { label: "¼ Pizza", grams: 350 },
  ],
  beverage_hot: [
    { label: "Short", grams: 240 },
    { label: "Tall", grams: 355 },
    { label: "Grande", grams: 473 },
    { label: "Venti", grams: 591 },
  ],
  beverage_cold: [
    { label: "Can", grams: 355 },
    { label: "Bottle", grams: 500 },
    { label: "Large", grams: 710 },
    { label: "XL", grams: 950 },
  ],
  yogurt: [
    { label: "Single", grams: 150 },
    { label: "Greek", grams: 170 },
    { label: "Large", grams: 227 },
    { label: "Family", grams: 340 },
  ],
  cereal: [
    { label: "¾ Cup", grams: 30 },
    { label: "1 Cup", grams: 40 },
    { label: "Bowl", grams: 50 },
    { label: "Large", grams: 70 },
  ],
  bread: [
    { label: "Slice", grams: 25 },
    { label: "2 Slices", grams: 50 },
    { label: "Roll", grams: 60 },
    { label: "Bagel", grams: 105 },
  ],
  dessert: [
    { label: "Small", grams: 50 },
    { label: "Regular", grams: 75 },
    { label: "Slice", grams: 90 },
    { label: "Large", grams: 120 },
  ],
  pasta: [
    { label: "½ Cup", grams: 70 },
    { label: "1 Cup", grams: 140 },
    { label: "Plate", grams: 200 },
    { label: "Bowl", grams: 280 },
  ],
  rice_bowl: [
    { label: "½ Cup", grams: 90 },
    { label: "1 Cup", grams: 180 },
    { label: "Bowl", grams: 220 },
    { label: "Large", grams: 320 },
  ],
};

const QUICK_UNITS: Record<string, string[]> = {
  sandwich: ["half", "whole", "6-inch", "12-inch"],
  burger: ["slider", "quarter", "half-pound", "grams"],
  wrap: ["wrap", "burrito", "grams"],
  salad: ["side", "entrée", "bowl", "grams"],
  soup: ["cup", "bowl", "ml", "oz"],
  pizza: ["slice", "personal", "quarter", "grams"],
  beverage_hot: ["cup", "ml", "oz"],
  beverage_cold: ["can", "bottle", "cup", "liter"],
  yogurt: ["cup", "container", "grams"],
  cereal: ["cup", "bowl", "grams"],
  bread: ["slice", "roll", "bagel", "grams"],
  dessert: ["piece", "slice", "grams"],
  pasta: ["cup", "plate", "bowl", "grams"],
  rice_bowl: ["cup", "bowl", "grams"],
};

export function getPresets(classId: string): Preset[] {
  return CLASS_PRESETS[classId] || [{ label: "Regular", grams: 150 }];
}

export function getQuickUnits(classId: string): string[] {
  return QUICK_UNITS[classId] || ["grams"];
}
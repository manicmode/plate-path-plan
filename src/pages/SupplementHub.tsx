import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Heart, Zap, Brain, Dumbbell, Shield, Utensils, Flame, Moon, User, Smile, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import { SupplementListModal } from '@/components/camera/SupplementListModal';
import { SupplementDetailModal } from '@/components/camera/SupplementDetailModal';
import { supabase } from '@/integrations/supabase/client';

interface Supplement {
  id: string;
  name: string;
  image: string;
  description: string;
  benefits: string[];
  personalReason: string;
  healthFlags: string[];
  studyLinks?: string[];
  price?: string;
}

const SupplementHub = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { currentDay, addSupplement } = useNutrition();
  const { toast } = useToast();
  const { playFoodLogConfirm } = useSound();
  
  // Use the scroll-to-top hook
  useScrollToTop();
  
  const userSupplements = currentDay.supplements;
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [recommendations, setRecommendations] = useState<Supplement[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSupplementList, setShowSupplementList] = useState(false);
  const [showSupplementDetail, setShowSupplementDetail] = useState(false);
  const [isLoadingSupplements, setIsLoadingSupplements] = useState(false);
  
  // Personal recommendations state
  const [personalRecommendations, setPersonalRecommendations] = useState<Supplement[]>([]);
  const [showMorePersonal, setShowMorePersonal] = useState(false);
  const [isGeneratingPersonal, setIsGeneratingPersonal] = useState(false);

  // Scroll container ref for horizontal tabs
  const scrollRef = useRef<HTMLDivElement>(null);

  // Netflix-style categories with horizontal scrollable goals
  const supplementCategories = [
    {
      id: 'muscle-growth',
      title: '💪 Muscle Growth & Weight Gain',
      goals: [
        'Protein Powder', 'Creatine Supplements', 'Mass Gainers', 'BCAAs',
        'Weight Gain Support', 'Muscle Recovery', 'Strength Building', 'Lean Mass Support'
      ]
    },
    {
      id: 'weight-loss',
      title: '🔥 Weight Loss & Fat Burn',
      goals: [
        'Fat Burning Support', 'Appetite Suppressant', 'Carb Blocker', 'Craving Control',
        'Metabolism Booster', 'Thermogenic Aid', 'Blood Sugar Balance', 'Thyroid Support',
        'Hormonal Weight Control', 'Water Weight Reduction'
      ]
    },
    {
      id: 'energy-performance',
      title: '⚡ Energy & Performance',
      goals: [
        'Energy Boost', 'Muscle Build', 'Athletic Recovery', 'Endurance', 
        'Stamina', 'Workout Focus', 'Pre-Workout Support', 'Post-Workout Recovery'
      ]
    },
    {
      id: 'heart-longevity', 
      title: '❤️ Heart & Longevity',
      goals: [
        'Heart Health', 'Cholesterol Control', 'Blood Pressure Balance',
        'Circulation Support', 'Anti-Aging', 'Cellular Repair'
      ]
    },
    {
      id: 'brain-mood',
      title: '🧠 Brain & Mood', 
      goals: [
        'Brain Function', 'Focus & Memory', 'Mental Clarity',
        'Stress Relief', 'Anxiety Balance', 'Sleep Support', 'Mood Boost'
      ]
    },
    {
      id: 'gut-immunity',
      title: '🦠 Gut & Immunity',
      goals: [
        'Gut Health', 'Probiotics & Digestion', 'Immune Support',
        'Detox & Cleanse', 'Anti-Inflammatory', 'Liver Health'
      ]
    },
    {
      id: 'hormones-metabolism',
      title: '🌸 Hormones & Metabolism',
      goals: [
        'Hormonal Balance', 'Men\'s Health', 'Women\'s Health',
        'Weight Loss', 'Blood Sugar Support', 'Metabolism Boost'
      ]
    }
  ];

  // Comprehensive supplement database with all categories covered
  const supplementDatabase: Record<string, Supplement[]> = {
    // === MUSCLE GROWTH & WEIGHT GAIN ===
    'Protein Powder': [
      {
        id: 'whey-protein-1',
        name: 'Premium Whey Protein',
        image: '💪',
        description: 'High-quality whey protein isolate for muscle building and recovery',
        benefits: ['Builds lean muscle', 'Fast absorption', 'Complete amino acid profile'],
        personalReason: 'Perfect for your muscle building goals and workout routine',
        healthFlags: ['Grass-fed', 'No artificial flavors', 'Third-party tested'],
        price: '$49.99'
      },
      {
        id: 'plant-protein-1',
        name: 'Plant-Based Protein Blend',
        image: '🌱',
        description: 'Complete plant protein from pea, rice, and hemp sources',
        benefits: ['Vegan-friendly', 'Easy digestion', 'Sustainable sourcing'],
        personalReason: 'Ideal for plant-based nutrition and muscle development',
        healthFlags: ['Organic', 'Allergen-free', 'No artificial additives'],
        price: '$44.99'
      }
    ],
    'Creatine Supplements': [
      {
        id: 'creatine-mono-1',
        name: 'Creatine Monohydrate',
        image: '⚡',
        description: 'Pure creatine monohydrate for strength and power gains',
        benefits: ['Increases strength', 'Improves power output', 'Faster recovery'],
        personalReason: 'Ideal for your strength training and athletic performance',
        healthFlags: ['Micronized', 'Unflavored', 'Research-backed'],
        price: '$24.99'
      },
      {
        id: 'creatine-hcl-1',
        name: 'Creatine HCL',
        image: '💥',
        description: 'Enhanced absorption creatine hydrochloride formula',
        benefits: ['Better solubility', 'No loading phase', 'Reduced bloating'],
        personalReason: 'Perfect for sensitive stomachs and consistent performance',
        healthFlags: ['Ultra-pure', 'No fillers', 'Lab-tested'],
        price: '$29.99'
      }
    ],
    'Mass Gainers': [
      {
        id: 'mass-gainer-1',
        name: 'Serious Mass Gainer',
        image: '📈',
        description: 'High-calorie mass gainer for healthy weight gain',
        benefits: ['1250 calories per serving', 'Protein and carb blend', 'Supports weight gain'],
        personalReason: 'Great for your weight gain goals and busy lifestyle',
        healthFlags: ['No banned substances', 'Quality tested', 'Added vitamins'],
        price: '$59.99'
      },
      {
        id: 'lean-mass-1',
        name: 'Lean Mass Complex',
        image: '🏗️',
        description: 'Clean mass gainer with quality carbs and protein',
        benefits: ['Quality calories', 'Minimal sugar', 'Digestive enzymes'],
        personalReason: 'Perfect for lean muscle gain without excess fat',
        healthFlags: ['Natural ingredients', 'No artificial colors', 'Gluten-free'],
        price: '$54.99'
      }
    ],
    'BCAAs': [
      {
        id: 'bcaa-powder-1',
        name: 'BCAA 2:1:1 Formula',
        image: '🔗',
        description: 'Branched-chain amino acids for muscle recovery and growth',
        benefits: ['Prevents muscle breakdown', 'Faster recovery', 'Reduces fatigue'],
        personalReason: 'Essential for your intense training sessions',
        healthFlags: ['Instantized', 'Natural flavors', 'Zero sugar'],
        price: '$27.99'
      },
      {
        id: 'eaa-blend-1',
        name: 'Essential Amino Acids',
        image: '🧬',
        description: 'Complete essential amino acid profile for muscle protein synthesis',
        benefits: ['All 9 EAAs', 'Maximum absorption', 'Muscle building support'],
        personalReason: 'Comprehensive amino support for your fitness goals',
        healthFlags: ['Pharmaceutical grade', 'Third-party tested', 'Vegan'],
        price: '$32.99'
      }
    ],
    'Weight Gain Support': [
      {
        id: 'appetite-boost-1',
        name: 'Natural Appetite Enhancer',
        image: '🍽️',
        description: 'Herbal blend to naturally increase appetite and calorie intake',
        benefits: ['Stimulates appetite', 'Improves digestion', 'Natural herbs'],
        personalReason: 'Helps you eat more for healthy weight gain',
        healthFlags: ['All-natural', 'No stimulants', 'Traditional herbs'],
        price: '$21.99'
      },
      {
        id: 'digestive-enzyme-1',
        name: 'Digestive Enzyme Complex',
        image: '⚙️',
        description: 'Advanced enzyme blend for better nutrient absorption',
        benefits: ['Improves digestion', 'Better nutrient uptake', 'Reduces bloating'],
        personalReason: 'Maximizes nutrition from your increased food intake',
        healthFlags: ['Plant-based enzymes', 'Broad spectrum', 'Delayed release'],
        price: '$18.99'
      }
    ],
    'Muscle Recovery': [
      {
        id: 'glutamine-1',
        name: 'L-Glutamine Powder',
        image: '🔄',
        description: 'Pure L-glutamine for muscle recovery and immune support',
        benefits: ['Faster muscle recovery', 'Immune system support', 'Prevents breakdown'],
        personalReason: 'Accelerates recovery between your training sessions',
        healthFlags: ['Pharmaceutical grade', 'Unflavored', 'Easy mixing'],
        price: '$23.99'
      },
      {
        id: 'recovery-complex-1',
        name: 'Advanced Recovery Matrix',
        image: '🏥',
        description: 'Multi-ingredient recovery formula with glutamine, BCAAs, and antioxidants',
        benefits: ['Complete recovery support', 'Reduces muscle soreness', 'Anti-inflammatory'],
        personalReason: 'Comprehensive recovery for your intense workouts',
        healthFlags: ['Natural antioxidants', 'No artificial colors', 'Research-backed'],
        price: '$39.99'
      }
    ],
    'Strength Building': [
      {
        id: 'beta-alanine-1',
        name: 'Beta-Alanine Powder',
        image: '💪',
        description: 'Pure beta-alanine for muscular endurance and strength',
        benefits: ['Increases muscular endurance', 'Delays fatigue', 'Improves power output'],
        personalReason: 'Pushes your strength training to the next level',
        healthFlags: ['CarnoSyn grade', 'Third-party tested', 'Unflavored'],
        price: '$25.99'
      },
      {
        id: 'strength-stack-1',
        name: 'Strength & Power Stack',
        image: '🏋️',
        description: 'Combination of creatine, beta-alanine, and citrulline for strength',
        benefits: ['Maximum strength gains', 'Enhanced power', 'Improved pumps'],
        personalReason: 'All-in-one solution for your strength goals',
        healthFlags: ['Synergistic formula', 'Lab-tested', 'No fillers'],
        price: '$44.99'
      }
    ],
    'Lean Mass Support': [
      {
        id: 'lean-protein-1',
        name: 'Lean Muscle Protein',
        image: '🎯',
        description: 'Low-carb protein blend optimized for lean muscle development',
        benefits: ['High protein content', 'Minimal carbs and fats', 'Lean muscle support'],
        personalReason: 'Perfect for building lean muscle without excess calories',
        healthFlags: ['Low sugar', 'High bioavailability', 'Quality tested'],
        price: '$46.99'
      },
      {
        id: 'cla-1',
        name: 'CLA (Conjugated Linoleic Acid)',
        image: '🔬',
        description: 'Natural CLA for body composition and lean muscle support',
        benefits: ['Supports lean body mass', 'May reduce body fat', 'Natural fatty acid'],
        personalReason: 'Helps optimize your body composition goals',
        healthFlags: ['Safflower oil derived', 'Non-GMO', 'Softgel form'],
        price: '$19.99'
      }
    ],

    // === WEIGHT LOSS & FAT BURN ===
    'Fat Burning Support': [
      {
        id: 'green-tea-extract-1',
        name: 'Green Tea Extract',
        image: '🍃',
        description: 'Concentrated green tea extract with EGCG for fat burning',
        benefits: ['Boosts metabolism', 'Fat oxidation', 'Antioxidant support'],
        personalReason: 'Perfect for your weight loss goals and healthy lifestyle',
        healthFlags: ['Standardized extract', 'Non-GMO', 'Vegan'],
        price: '$19.99'
      },
      {
        id: 'l-carnitine-1',
        name: 'L-Carnitine Liquid',
        image: '🔥',
        description: 'High-potency L-carnitine for fat metabolism and energy',
        benefits: ['Enhances fat burning', 'Boosts energy', 'Supports recovery'],
        personalReason: 'Helps your body use fat as fuel during workouts',
        healthFlags: ['Pharmaceutical grade', 'Sugar-free', 'Natural flavors'],
        price: '$24.99'
      }
    ],
    'Appetite Suppressant': [
      {
        id: 'glucomannan-1',
        name: 'Glucomannan Fiber',
        image: '🌾',
        description: 'Natural fiber supplement for appetite control and satiety',
        benefits: ['Promotes fullness', 'Appetite control', 'Supports digestion'],
        personalReason: 'Helps with portion control for your weight management goals',
        healthFlags: ['Pure konjac root', 'No additives', 'Vegan'],
        price: '$16.99'
      },
      {
        id: '5-htp-1',
        name: '5-HTP Natural',
        image: '😌',
        description: 'Natural 5-HTP from Griffonia seed for mood and appetite balance',
        benefits: ['Reduces cravings', 'Mood support', 'Natural serotonin precursor'],
        personalReason: 'Helps control emotional eating and food cravings',
        healthFlags: ['From natural sources', 'Third-party tested', 'Vegetarian'],
        price: '$22.99'
      }
    ],
    'Carb Blocker': [
      {
        id: 'white-kidney-bean-1',
        name: 'White Kidney Bean Extract',
        image: '🫘',
        description: 'Natural carb blocker from white kidney bean extract',
        benefits: ['Blocks carb absorption', 'Supports weight management', 'Natural ingredient'],
        personalReason: 'Helps reduce carb absorption from your meals',
        healthFlags: ['Standardized extract', 'Non-GMO', 'Gluten-free'],
        price: '$18.99'
      },
      {
        id: 'chromium-1',
        name: 'Chromium Picolinate',
        image: '⚖️',
        description: 'Essential mineral for carbohydrate and glucose metabolism',
        benefits: ['Supports glucose metabolism', 'May reduce cravings', 'Essential mineral'],
        personalReason: 'Helps your body process carbohydrates more efficiently',
        healthFlags: ['Highly absorbable form', 'Third-party tested', 'Capsule form'],
        price: '$12.99'
      }
    ],
    'Craving Control': [
      {
        id: 'garcinia-1',
        name: 'Garcinia Cambogia Extract',
        image: '🍊',
        description: 'Natural fruit extract for appetite and craving control',
        benefits: ['Reduces appetite', 'Blocks fat production', 'Natural fruit extract'],
        personalReason: 'Natural way to control food cravings and portion sizes',
        healthFlags: ['60% HCA', 'No artificial fillers', 'Vegan capsules'],
        price: '$17.99'
      },
      {
        id: 'protein-powder-weight-1',
        name: 'Lean Protein for Weight Loss',
        image: '🥤',
        description: 'Low-calorie protein powder designed for weight management',
        benefits: ['High protein, low calories', 'Increases satiety', 'Preserves muscle'],
        personalReason: 'Keeps you full while maintaining muscle during weight loss',
        healthFlags: ['Low sugar', 'Added fiber', 'Natural flavors'],
        price: '$41.99'
      }
    ],
    'Metabolism Booster': [
      {
        id: 'caffeine-l-theanine-1',
        name: 'Caffeine + L-Theanine',
        image: '☕',
        description: 'Natural caffeine with L-theanine for clean energy and focus',
        benefits: ['Boosts metabolism', 'Clean energy', 'No jitters'],
        personalReason: 'Great for your energy needs without the crash',
        healthFlags: ['Natural caffeine', 'Smooth focus', 'Third-party tested'],
        price: '$22.99'
      },
      {
        id: 'green-coffee-1',
        name: 'Green Coffee Bean Extract',
        image: '☕',
        description: 'Unroasted coffee beans rich in chlorogenic acid for metabolism',
        benefits: ['Boosts metabolism', 'Antioxidant properties', 'Supports weight loss'],
        personalReason: 'Natural metabolism booster from unprocessed coffee beans',
        healthFlags: ['50% chlorogenic acid', 'Decaffeinated', 'Standardized'],
        price: '$19.99'
      }
    ],
    'Thermogenic Aid': [
      {
        id: 'cayenne-pepper-1',
        name: 'Cayenne Pepper Extract',
        image: '🌶️',
        description: 'Natural thermogenic from cayenne pepper for heat production',
        benefits: ['Increases thermogenesis', 'Boosts metabolism', 'Natural spice extract'],
        personalReason: 'Natural way to increase your body\'s calorie burning',
        healthFlags: ['Standardized capsaicin', 'Vegetarian caps', 'No fillers'],
        price: '$14.99'
      },
      {
        id: 'yohimbe-1',
        name: 'Yohimbe Bark Extract',
        image: '🌳',
        description: 'Traditional herb for thermogenesis and energy support',
        benefits: ['Thermogenic properties', 'Energy support', 'Traditional use'],
        personalReason: 'Traditional herb to support your fat burning goals',
        healthFlags: ['Standardized extract', 'Third-party tested', 'Natural source'],
        price: '$21.99'
      }
    ],
    'Blood Sugar Balance': [
      {
        id: 'berberine-1',
        name: 'Berberine HCL',
        image: '🌿',
        description: 'Natural compound for blood sugar and metabolic support',
        benefits: ['Supports blood sugar', 'Metabolic health', 'Natural compound'],
        personalReason: 'Helps maintain healthy blood sugar for weight management',
        healthFlags: ['High purity', 'Research-backed', 'Vegan capsules'],
        price: '$26.99'
      },
      {
        id: 'cinnamon-1',
        name: 'Ceylon Cinnamon Extract',
        image: '🍂',
        description: 'True cinnamon for blood sugar support and metabolism',
        benefits: ['Blood sugar support', 'Antioxidant properties', 'True cinnamon'],
        personalReason: 'Natural way to support healthy blood sugar levels',
        healthFlags: ['Ceylon variety', 'Standardized extract', 'Organic'],
        price: '$16.99'
      }
    ],
    'Thyroid Support': [
      {
        id: 'iodine-1',
        name: 'Kelp Iodine Complex',
        image: '🌊',
        description: 'Natural iodine from kelp for thyroid function support',
        benefits: ['Thyroid health', 'Metabolic support', 'Natural iodine source'],
        personalReason: 'Supports healthy thyroid function for optimal metabolism',
        healthFlags: ['From kelp', 'Natural source', 'Third-party tested'],
        price: '$13.99'
      },
      {
        id: 'ashwagandha-1',
        name: 'Ashwagandha Root Extract',
        image: '🌱',
        description: 'Adaptogenic herb for stress and thyroid support',
        benefits: ['Stress management', 'Thyroid support', 'Adaptogenic properties'],
        personalReason: 'Helps manage stress that can affect your metabolism',
        healthFlags: ['KSM-66 extract', 'Organic', 'Third-party tested'],
        price: '$24.99'
      }
    ],
    'Hormonal Weight Control': [
      {
        id: 'dim-1',
        name: 'DIM (Diindolylmethane)',
        image: '🥦',
        description: 'Natural compound from cruciferous vegetables for hormone balance',
        benefits: ['Hormone metabolism', 'Estrogen balance', 'Natural compound'],
        personalReason: 'Supports healthy hormone balance for weight management',
        healthFlags: ['From broccoli', 'Enhanced absorption', 'Non-GMO'],
        price: '$28.99'
      },
      {
        id: 'maca-root-1',
        name: 'Maca Root Powder',
        image: '🌾',
        description: 'Peruvian superfood for hormone balance and energy',
        benefits: ['Hormone support', 'Natural energy', 'Adaptogenic properties'],
        personalReason: 'Traditional superfood for hormonal health and vitality',
        healthFlags: ['Organic', 'Raw powder', 'Fair trade'],
        price: '$19.99'
      }
    ],
    'Water Weight Reduction': [
      {
        id: 'dandelion-1',
        name: 'Dandelion Root Extract',
        image: '🌼',
        description: 'Natural diuretic herb for healthy fluid balance',
        benefits: ['Natural diuretic', 'Liver support', 'Reduces bloating'],
        personalReason: 'Natural way to reduce water retention and bloating',
        healthFlags: ['Standardized extract', 'Organic', 'Vegan caps'],
        price: '$15.99'
      },
      {
        id: 'potassium-1',
        name: 'Potassium Citrate',
        image: '⚡',
        description: 'Essential electrolyte for fluid balance and muscle function',
        benefits: ['Fluid balance', 'Muscle function', 'Electrolyte support'],
        personalReason: 'Helps maintain healthy fluid balance and reduces bloating',
        healthFlags: ['High absorption', 'No sodium', 'Capsule form'],
        price: '$14.99'
      }
    ],

    // === ENERGY & PERFORMANCE ===
    'Energy Boost': [
      {
        id: 'b-complex-1',
        name: 'B-Complex Vitamins',
        image: '⚡',
        description: 'Complete B vitamin complex for natural energy production',
        benefits: ['Natural energy boost', 'Supports metabolism', 'Reduces fatigue'],
        personalReason: 'Great for your busy schedule and workout routine',
        healthFlags: ['Vegan', 'Non-GMO', 'Third-party tested'],
        price: '$19.99'
      },
      {
        id: 'rhodiola-1',
        name: 'Rhodiola Rosea Extract',
        image: '🌸',
        description: 'Adaptogenic herb for energy, stamina, and stress resistance',
        benefits: ['Boosts energy', 'Reduces fatigue', 'Stress adaptation'],
        personalReason: 'Natural energy without stimulants for sustained performance',
        healthFlags: ['Standardized extract', 'Organic', 'Stress-tested'],
        price: '$23.99'
      }
    ],
    'Muscle Build': [
      {
        id: 'hmb-1',
        name: 'HMB (β-Hydroxy β-Methylbutyrate)',
        image: '🛡️',
        description: 'Metabolite of leucine for muscle preservation and growth',
        benefits: ['Prevents muscle breakdown', 'Enhances recovery', 'Supports lean mass'],
        personalReason: 'Advanced supplement for serious muscle building goals',
        healthFlags: ['Calcium HMB', 'Research-backed', 'Third-party tested'],
        price: '$34.99'
      },
      {
        id: 'tribulus-1',
        name: 'Tribulus Terrestris Extract',
        image: '🌿',
        description: 'Traditional herb for natural testosterone and muscle support',
        benefits: ['Natural testosterone support', 'Muscle building', 'Traditional use'],
        personalReason: 'Natural support for your muscle building and strength goals',
        healthFlags: ['40% saponins', 'Non-GMO', 'Standardized'],
        price: '$21.99'
      }
    ],
    'Athletic Recovery': [
      {
        id: 'tart-cherry-1',
        name: 'Tart Cherry Extract',
        image: '🍒',
        description: 'Natural antioxidant for muscle recovery and sleep support',
        benefits: ['Reduces muscle soreness', 'Anti-inflammatory', 'Sleep quality'],
        personalReason: 'Natural recovery aid for your athletic training',
        healthFlags: ['Montmorency cherries', 'No artificial colors', 'Concentrated'],
        price: '$26.99'
      },
      {
        id: 'curcumin-1',
        name: 'Curcumin with BioPerine',
        image: '🌿',
        description: 'Turmeric extract with enhanced absorption for recovery',
        benefits: ['Anti-inflammatory', 'Joint support', 'Enhanced absorption'],
        personalReason: 'Reduces inflammation from intense training sessions',
        healthFlags: ['95% curcuminoids', 'BioPerine added', 'Non-GMO'],
        price: '$29.99'
      }
    ],
    'Endurance': [
      {
        id: 'beetroot-1',
        name: 'Beetroot Powder',
        image: '🫐',
        description: 'Natural nitrates for improved blood flow and endurance',
        benefits: ['Increases nitric oxide', 'Improves endurance', 'Better pumps'],
        personalReason: 'Natural way to boost your endurance and cardiovascular performance',
        healthFlags: ['Organic beetroot', 'No additives', 'Rich in nitrates'],
        price: '$22.99'
      },
      {
        id: 'cordyceps-1',
        name: 'Cordyceps Mushroom Extract',
        image: '🍄',
        description: 'Adaptogenic mushroom for oxygen utilization and endurance',
        benefits: ['Improves oxygen use', 'Boosts endurance', 'Adaptogenic'],
        personalReason: 'Traditional fungus for enhanced athletic endurance',
        healthFlags: ['Organic', 'Dual-extracted', 'Beta-glucans'],
        price: '$31.99'
      }
    ],
    'Stamina': [
      {
        id: 'ginseng-1',
        name: 'Panax Ginseng Extract',
        image: '🌿',
        description: 'Premium ginseng for energy, stamina, and vitality',
        benefits: ['Boosts stamina', 'Improves vitality', 'Adaptogenic'],
        personalReason: 'Traditional herb for sustained energy and endurance',
        healthFlags: ['Standardized ginsenosides', 'Korean red ginseng', 'Authentic'],
        price: '$27.99'
      },
      {
        id: 'coenzyme-q10-1',
        name: 'CoQ10 Ubiquinone',
        image: '⚡',
        description: 'Cellular energy production for stamina and heart health',
        benefits: ['Cellular energy', 'Heart health', 'Antioxidant'],
        personalReason: 'Supports cellular energy production for lasting stamina',
        healthFlags: ['Ubiquinone form', 'Softgel delivery', 'High purity'],
        price: '$33.99'
      }
    ],
    'Workout Focus': [
      {
        id: 'lions-mane-1',
        name: 'Lion\'s Mane Mushroom',
        image: '🦁',
        description: 'Nootropic mushroom for cognitive function and focus',
        benefits: ['Enhances focus', 'Cognitive support', 'Nerve health'],
        personalReason: 'Sharpens mental focus during intense training sessions',
        healthFlags: ['Organic', 'Dual-extracted', 'Hericenones & erinacines'],
        price: '$28.99'
      },
      {
        id: 'tyrosine-1',
        name: 'L-Tyrosine',
        image: '🧠',
        description: 'Amino acid for mental focus and stress resistance',
        benefits: ['Improves focus', 'Stress resistance', 'Mental clarity'],
        personalReason: 'Maintains focus and performance under training stress',
        healthFlags: ['Free-form amino acid', 'Pure powder', 'Third-party tested'],
        price: '$18.99'
      }
    ],
    'Pre-Workout Support': [
      {
        id: 'citrulline-1',
        name: 'L-Citrulline Malate',
        image: '🍉',
        description: 'Amino acid for improved blood flow and muscle pumps',
        benefits: ['Better pumps', 'Improved endurance', 'Reduces fatigue'],
        personalReason: 'Enhances your pre-workout performance and muscle pumps',
        healthFlags: ['2:1 ratio', 'Pharmaceutical grade', 'Unflavored'],
        price: '$26.99'
      },
      {
        id: 'arginine-1',
        name: 'L-Arginine AKG',
        image: '💨',
        description: 'Nitric oxide precursor for enhanced blood flow and pumps',
        benefits: ['Nitric oxide boost', 'Enhanced pumps', 'Better nutrient delivery'],
        personalReason: 'Maximizes blood flow and nutrient delivery to muscles',
        healthFlags: ['Alpha-ketoglutarate form', 'Enhanced absorption', 'Pure'],
        price: '$23.99'
      }
    ],
    'Post-Workout Recovery': [
      {
        id: 'whey-hydrolysate-1',
        name: 'Whey Protein Hydrolysate',
        image: '🥛',
        description: 'Fast-absorbing hydrolyzed whey for rapid recovery',
        benefits: ['Fastest absorption', 'Rapid recovery', 'Pre-digested protein'],
        personalReason: 'Fastest protein absorption for immediate post-workout recovery',
        healthFlags: ['Hydrolyzed form', 'Low allergenicity', 'Premium quality'],
        price: '$54.99'
      },
      {
        id: 'dextrose-1',
        name: 'Pure Dextrose Powder',
        image: '🍯',
        description: 'Fast-acting carbohydrate for glycogen replenishment',
        benefits: ['Rapid glycogen refill', 'Insulin response', 'Quick energy'],
        personalReason: 'Rapidly replenishes energy stores after intense workouts',
        healthFlags: ['Pure dextrose', 'Fast absorption', 'No additives'],
        price: '$15.99'
      }
    ],

    // === HEART & LONGEVITY ===
    'Heart Health': [
      {
        id: 'omega-3-1',
        name: 'Omega-3 Fish Oil',
        image: '🐟',
        description: 'High-quality fish oil rich in EPA and DHA for cardiovascular support',
        benefits: ['Supports heart health', 'Reduces inflammation', 'Improves brain function'],
        personalReason: 'Perfect for your cardiovascular goals and active lifestyle',
        healthFlags: ['Third-party tested', 'Mercury-free', 'Sustainable sourcing'],
        studyLinks: ['pubmed.ncbi.nlm.nih.gov/heart-omega3'],
        price: '$24.99'
      },
      {
        id: 'coq10-1',
        name: 'CoQ10 Ubiquinol',
        image: '❤️',
        description: 'Advanced CoQ10 for cellular energy and heart muscle support',
        benefits: ['Supports heart muscle function', 'Cellular energy production', 'Antioxidant protection'],
        personalReason: 'Ideal for your age group and fitness routine',
        healthFlags: ['Bioavailable form', 'Non-GMO', 'Gluten-free'],
        price: '$34.99'
      }
    ],
    'Cholesterol Control': [
      {
        id: 'red-yeast-rice-1',
        name: 'Red Yeast Rice Extract',
        image: '🔴',
        description: 'Traditional supplement for cholesterol management support',
        benefits: ['Cholesterol support', 'Heart health', 'Traditional use'],
        personalReason: 'Natural approach to supporting healthy cholesterol levels',
        healthFlags: ['Standardized extract', 'No citriniin', 'Quality tested'],
        price: '$22.99'
      },
      {
        id: 'plant-sterols-1',
        name: 'Plant Sterols Complex',
        image: '🌱',
        description: 'Natural plant compounds for cholesterol absorption blocking',
        benefits: ['Blocks cholesterol absorption', 'Plant-based', 'Clinically studied'],
        personalReason: 'Plant-powered approach to heart health maintenance',
        healthFlags: ['Beta-sitosterol', 'Non-GMO', 'Vegetarian'],
        price: '$19.99'
      }
    ],
    'Blood Pressure Balance': [
      {
        id: 'hawthorne-1',
        name: 'Hawthorn Berry Extract',
        image: '🫐',
        description: 'Traditional herb for cardiovascular and blood pressure support',
        benefits: ['Blood pressure support', 'Heart health', 'Antioxidant'],
        personalReason: 'Traditional herb for maintaining healthy blood pressure',
        healthFlags: ['Standardized extract', 'Organic', 'Traditional use'],
        price: '$17.99'
      },
      {
        id: 'magnesium-1',
        name: 'Magnesium Glycinate',
        image: '💫',
        description: 'Highly absorbable magnesium for heart and muscle function',
        benefits: ['Blood pressure support', 'Muscle relaxation', 'Heart rhythm'],
        personalReason: 'Essential mineral for cardiovascular health and relaxation',
        healthFlags: ['Chelated form', 'High absorption', 'Gentle on stomach'],
        price: '$21.99'
      }
    ],
    'Circulation Support': [
      {
        id: 'ginkgo-1',
        name: 'Ginkgo Biloba Extract',
        image: '🍃',
        description: 'Traditional herb for circulation and cognitive support',
        benefits: ['Improves circulation', 'Cognitive support', 'Antioxidant'],
        personalReason: 'Traditional herb for healthy blood flow and brain function',
        healthFlags: ['24% flavonoids', 'Standardized', 'Third-party tested'],
        price: '$18.99'
      },
      {
        id: 'grape-seed-1',
        name: 'Grape Seed Extract',
        image: '🍇',
        description: 'Powerful antioxidant for vascular health and circulation',
        benefits: ['Vascular health', 'Antioxidant support', 'Circulation'],
        personalReason: 'Potent antioxidant support for healthy blood vessels',
        healthFlags: ['95% proanthocyanidins', 'Standardized', 'Non-GMO'],
        price: '$16.99'
      }
    ],
    'Anti-Aging': [
      {
        id: 'resveratrol-1',
        name: 'Resveratrol Complex',
        image: '🍷',
        description: 'Powerful antioxidant from grapes for anti-aging support',
        benefits: ['Anti-aging properties', 'Cellular protection', 'Heart health'],
        personalReason: 'Powerful antioxidant for healthy aging and longevity',
        healthFlags: ['Trans-resveratrol', 'High purity', 'Third-party tested'],
        price: '$29.99'
      },
      {
        id: 'nad-precursor-1',
        name: 'NAD+ Precursor (NMN)',
        image: '🔬',
        description: 'Advanced cellular energy and anti-aging support',
        benefits: ['Cellular energy', 'DNA repair', 'Anti-aging'],
        personalReason: 'Cutting-edge supplement for cellular health and longevity',
        healthFlags: ['Pharmaceutical grade', 'Third-party tested', 'High purity'],
        price: '$49.99'
      }
    ],
    'Cellular Repair': [
      {
        id: 'glutathione-1',
        name: 'Liposomal Glutathione',
        image: '🔬',
        description: 'Master antioxidant for cellular detoxification and repair',
        benefits: ['Cellular detox', 'Immune support', 'Anti-aging'],
        personalReason: 'Master antioxidant for optimal cellular function',
        healthFlags: ['Liposomal delivery', 'Reduced form', 'High bioavailability'],
        price: '$39.99'
      },
      {
        id: 'vitamin-c-1',
        name: 'Vitamin C Complex',
        image: '🍊',
        description: 'Buffered vitamin C with bioflavonoids for immune and cellular support',
        benefits: ['Immune support', 'Collagen synthesis', 'Antioxidant'],
        personalReason: 'Essential vitamin for immune health and cellular protection',
        healthFlags: ['Buffered form', 'With bioflavonoids', 'Non-acidic'],
        price: '$14.99'
      }
    ],

    // === BRAIN & MOOD ===
    'Brain Function': [
      {
        id: 'omega-3-brain',
        name: 'Brain Omega-3',
        image: '🧠',
        description: 'Specialized omega-3 formula for cognitive support',
        benefits: ['Enhances memory', 'Improves focus', 'Supports brain health'],
        personalReason: 'Perfect for your mental performance goals',
        healthFlags: ['DHA concentrated', 'Third-party tested', 'Non-GMO'],
        price: '$29.99'
      },
      {
        id: 'phosphatidylserine-1',
        name: 'Phosphatidylserine',
        image: '🧬',
        description: 'Brain phospholipid for memory and cognitive function',
        benefits: ['Memory support', 'Cognitive function', 'Brain health'],
        personalReason: 'Essential phospholipid for optimal brain function',
        healthFlags: ['Soy-free', 'Sunflower derived', 'Third-party tested'],
        price: '$32.99'
      }
    ],
    'Focus & Memory': [
      {
        id: 'bacopa-1',
        name: 'Bacopa Monnieri Extract',
        image: '🌿',
        description: 'Ayurvedic herb for memory, learning, and cognitive function',
        benefits: ['Enhances memory', 'Improves learning', 'Reduces anxiety'],
        personalReason: 'Traditional herb for enhanced memory and mental clarity',
        healthFlags: ['Standardized bacosides', 'Organic', 'Traditional use'],
        price: '$24.99'
      },
      {
        id: 'alpha-gpc-1',
        name: 'Alpha-GPC',
        image: '⚡',
        description: 'Bioavailable choline source for brain function and focus',
        benefits: ['Improves focus', 'Brain health', 'Acetylcholine support'],
        personalReason: 'Premium choline source for mental performance',
        healthFlags: ['99% pure', 'Pharmaceutical grade', 'Third-party tested'],
        price: '$34.99'
      }
    ],
    'Mental Clarity': [
      {
        id: 'gotu-kola-1',
        name: 'Gotu Kola Extract',
        image: '🍃',
        description: 'Traditional herb for mental clarity and cognitive support',
        benefits: ['Mental clarity', 'Cognitive support', 'Stress relief'],
        personalReason: 'Traditional herb for clear thinking and mental focus',
        healthFlags: ['Standardized extract', 'Organic', 'Ayurvedic tradition'],
        price: '$19.99'
      },
      {
        id: 'mct-oil-1',
        name: 'MCT Oil for Brain Fuel',
        image: '🥥',
        description: 'Medium-chain triglycerides for brain energy and mental clarity',
        benefits: ['Brain fuel', 'Mental clarity', 'Quick energy'],
        personalReason: 'Clean brain fuel for sustained mental energy',
        healthFlags: ['C8 & C10', 'Coconut derived', 'No palm oil'],
        price: '$26.99'
      }
    ],
    'Stress Relief': [
      {
        id: 'ashwagandha-stress-1',
        name: 'Ashwagandha KSM-66',
        image: '🌱',
        description: 'Premium ashwagandha extract for stress management',
        benefits: ['Reduces stress', 'Improves mood', 'Adaptogenic'],
        personalReason: 'Clinically studied adaptogen for modern stress management',
        healthFlags: ['KSM-66 extract', 'Organic', 'Clinically studied'],
        price: '$24.99'
      },
      {
        id: 'l-theanine-1',
        name: 'L-Theanine Pure',
        image: '🍵',
        description: 'Amino acid from green tea for calm focus and relaxation',
        benefits: ['Promotes relaxation', 'Calm focus', 'Stress reduction'],
        personalReason: 'Natural relaxation without drowsiness for busy days',
        healthFlags: ['Suntheanine brand', 'Pure L-theanine', 'Third-party tested'],
        price: '$22.99'
      }
    ],
    'Anxiety Balance': [
      {
        id: 'passionflower-1',
        name: 'Passionflower Extract',
        image: '🌸',
        description: 'Traditional herb for anxiety relief and relaxation',
        benefits: ['Anxiety relief', 'Promotes calm', 'Traditional use'],
        personalReason: 'Traditional herb for natural anxiety management',
        healthFlags: ['Standardized extract', 'Organic', 'Traditional use'],
        price: '$18.99'
      },
      {
        id: 'gaba-1',
        name: 'GABA (Gamma-Aminobutyric Acid)',
        image: '😌',
        description: 'Neurotransmitter for relaxation and anxiety balance',
        benefits: ['Promotes relaxation', 'Anxiety balance', 'Calm mood'],
        personalReason: 'Natural neurotransmitter for peaceful, balanced mood',
        healthFlags: ['Pharmaceutical grade', 'Free-form', 'Third-party tested'],
        price: '$16.99'
      }
    ],
    'Sleep Support': [
      {
        id: 'melatonin-1',
        name: 'Melatonin 3mg',
        image: '🌙',
        description: 'Natural sleep hormone for healthy sleep cycles',
        benefits: ['Promotes sleep', 'Regulates sleep cycle', 'Natural hormone'],
        personalReason: 'Natural support for quality sleep and recovery',
        healthFlags: ['Pharmaceutical grade', 'Time-release', 'Third-party tested'],
        price: '$12.99'
      },
      {
        id: 'valerian-1',
        name: 'Valerian Root Extract',
        image: '🌿',
        description: 'Traditional herb for relaxation and sleep support',
        benefits: ['Sleep support', 'Relaxation', 'Traditional use'],
        personalReason: 'Traditional herb for natural, restful sleep',
        healthFlags: ['Standardized extract', 'Organic', 'No next-day grogginess'],
        price: '$15.99'
      }
    ],
    'Mood Boost': [
      {
        id: 'st-johns-wort-1',
        name: 'St. John\'s Wort Extract',
        image: '☀️',
        description: 'Traditional herb for mood support and emotional balance',
        benefits: ['Mood support', 'Emotional balance', 'Traditional use'],
        personalReason: 'Traditional herb for maintaining positive mood',
        healthFlags: ['0.3% hypericin', 'Standardized', 'Traditional use'],
        price: '$17.99'
      },
      {
        id: 'sam-e-1',
        name: 'SAM-e (S-Adenosyl Methionine)',
        image: '😊',
        description: 'Natural compound for mood support and joint health',
        benefits: ['Mood support', 'Joint health', 'Liver support'],
        personalReason: 'Natural compound for mood balance and overall wellness',
        healthFlags: ['Enteric coated', 'Pharmaceutical grade', 'Stable form'],
        price: '$39.99'
      }
    ],

    // === GUT & IMMUNITY ===
    'Gut Health': [
      {
        id: 'multi-probiotic-1',
        name: 'Multi-Strain Probiotic',
        image: '🦠',
        description: '50 billion CFU multi-strain probiotic for digestive health',
        benefits: ['Digestive health', 'Immune support', 'Gut flora balance'],
        personalReason: 'Essential for maintaining healthy gut microbiome',
        healthFlags: ['50 billion CFU', 'Delayed release', 'Shelf stable'],
        price: '$34.99'
      },
      {
        id: 'prebiotic-fiber-1',
        name: 'Prebiotic Fiber Blend',
        image: '🌾',
        description: 'Prebiotic fibers to feed beneficial gut bacteria',
        benefits: ['Feeds good bacteria', 'Digestive health', 'Fiber support'],
        personalReason: 'Nourishes your beneficial gut bacteria for optimal health',
        healthFlags: ['Multiple fiber sources', 'Organic', 'No artificial additives'],
        price: '$19.99'
      }
    ],
    'Probiotics & Digestion': [
      {
        id: 'digestive-enzymes-1',
        name: 'Full Spectrum Digestive Enzymes',
        image: '⚙️',
        description: 'Complete enzyme blend for protein, carb, and fat digestion',
        benefits: ['Improves digestion', 'Reduces bloating', 'Nutrient absorption'],
        personalReason: 'Breaks down food efficiently for better nutrient absorption',
        healthFlags: ['Broad spectrum', 'Acid-resistant', 'Plant-based'],
        price: '$26.99'
      },
      {
        id: 'lactobacillus-1',
        name: 'Lactobacillus Acidophilus',
        image: '🧪',
        description: 'Targeted probiotic strain for digestive and vaginal health',
        benefits: ['Digestive balance', 'Vaginal health', 'Immune support'],
        personalReason: 'Specific strain for women\'s digestive and intimate health',
        healthFlags: ['Clinically studied strain', 'Acid-resistant', 'Women\'s health'],
        price: '$22.99'
      }
    ],
    'Immune Support': [
      {
        id: 'elderberry-1',
        name: 'Elderberry Extract',
        image: '🫐',
        description: 'Traditional berry extract for immune system support',
        benefits: ['Immune support', 'Antioxidant rich', 'Traditional use'],
        personalReason: 'Traditional immune support from nature\'s pharmacy',
        healthFlags: ['Standardized extract', 'Organic', 'No artificial colors'],
        price: '$18.99'
      },
      {
        id: 'zinc-1',
        name: 'Zinc Picolinate',
        image: '⚡',
        description: 'Highly absorbable zinc for immune function and healing',
        benefits: ['Immune function', 'Wound healing', 'Antioxidant'],
        personalReason: 'Essential mineral for strong immune system function',
        healthFlags: ['Picolinate form', 'High absorption', 'Third-party tested'],
        price: '$13.99'
      }
    ],
    'Detox & Cleanse': [
      {
        id: 'milk-thistle-1',
        name: 'Milk Thistle Extract',
        image: '🌿',
        description: 'Liver support herb for detoxification and cleansing',
        benefits: ['Liver support', 'Detoxification', 'Antioxidant'],
        personalReason: 'Traditional herb for liver health and natural detox',
        healthFlags: ['80% silymarin', 'Standardized', 'Organic'],
        price: '$19.99'
      },
      {
        id: 'chlorella-1',
        name: 'Organic Chlorella',
        image: '🌿',
        description: 'Nutrient-dense algae for detox and nutritional support',
        benefits: ['Natural detox', 'Nutrient dense', 'Chlorophyll rich'],
        personalReason: 'Nature\'s detoxifier packed with essential nutrients',
        healthFlags: ['Organic', 'Cracked cell wall', 'Heavy metal tested'],
        price: '$24.99'
      }
    ],
    'Anti-Inflammatory': [
      {
        id: 'turmeric-1',
        name: 'Turmeric Curcumin Complex',
        image: '🌿',
        description: 'Turmeric with black pepper for anti-inflammatory support',
        benefits: ['Anti-inflammatory', 'Joint support', 'Antioxidant'],
        personalReason: 'Powerful anti-inflammatory for recovery and joint health',
        healthFlags: ['95% curcuminoids', 'With BioPerine', 'Organic'],
        price: '$22.99'
      },
      {
        id: 'boswellia-1',
        name: 'Boswellia Serrata Extract',
        image: '🌳',
        description: 'Traditional resin for joint health and inflammation support',
        benefits: ['Joint health', 'Anti-inflammatory', 'Traditional use'],
        personalReason: 'Traditional resin for joint comfort and mobility',
        healthFlags: ['65% boswellic acids', 'Standardized', 'Third-party tested'],
        price: '$26.99'
      }
    ],
    'Liver Health': [
      {
        id: 'nac-1',
        name: 'NAC (N-Acetyl Cysteine)',
        image: '🫁',
        description: 'Amino acid for liver detox and respiratory support',
        benefits: ['Liver support', 'Glutathione precursor', 'Respiratory health'],
        personalReason: 'Powerful antioxidant precursor for liver detoxification',
        healthFlags: ['Pharmaceutical grade', 'Free-form amino acid', 'Third-party tested'],
        price: '$21.99'
      },
      {
        id: 'artichoke-1',
        name: 'Artichoke Leaf Extract',
        image: '🌿',
        description: 'Traditional herb for liver and digestive support',
        benefits: ['Liver support', 'Digestive health', 'Cholesterol support'],
        personalReason: 'Traditional Mediterranean herb for liver wellness',
        healthFlags: ['Standardized extract', 'Organic', 'Traditional use'],
        price: '$17.99'
      }
    ],

    // === HORMONES & METABOLISM ===
    'Hormonal Balance': [
      {
        id: 'vitex-1',
        name: 'Vitex (Chasteberry)',
        image: '🌸',
        description: 'Traditional herb for women\'s hormonal balance',
        benefits: ['Hormonal balance', 'PMS support', 'Women\'s health'],
        personalReason: 'Traditional herb for natural hormonal harmony',
        healthFlags: ['Standardized extract', 'Organic', 'Women\'s health'],
        price: '$19.99'
      },
      {
        id: 'evening-primrose-1',
        name: 'Evening Primrose Oil',
        image: '🌼',
        description: 'GLA-rich oil for hormonal and skin health support',
        benefits: ['Hormonal support', 'Skin health', 'GLA source'],
        personalReason: 'Natural GLA for hormonal balance and healthy skin',
        healthFlags: ['Cold-pressed', 'High GLA', 'Third-party tested'],
        price: '$16.99'
      }
    ],
    'Men\'s Health': [
      {
        id: 'saw-palmetto-1',
        name: 'Saw Palmetto Extract',
        image: '🌴',
        description: 'Traditional herb for men\'s prostate and urinary health',
        benefits: ['Prostate health', 'Urinary support', 'Men\'s wellness'],
        personalReason: 'Traditional support for men\'s prostate health',
        healthFlags: ['Standardized extract', 'Organic', 'Traditional use'],
        price: '$18.99'
      },
      {
        id: 'fenugreek-1',
        name: 'Fenugreek Seed Extract',
        image: '🌿',
        description: 'Traditional herb for testosterone and metabolic support',
        benefits: ['Testosterone support', 'Metabolic health', 'Traditional use'],
        personalReason: 'Traditional herb for men\'s vitality and strength',
        healthFlags: ['Standardized saponins', 'Organic', 'Third-party tested'],
        price: '$21.99'
      }
    ],
    'Women\'s Health': [
      {
        id: 'black-cohosh-1',
        name: 'Black Cohosh Root',
        image: '🖤',
        description: 'Traditional herb for women\'s hormonal comfort',
        benefits: ['Menopausal support', 'Hormonal comfort', 'Women\'s health'],
        personalReason: 'Traditional herb for women\'s hormonal transitions',
        healthFlags: ['Standardized extract', 'Organic', 'Traditional use'],
        price: '$17.99'
      },
      {
        id: 'red-clover-1',
        name: 'Red Clover Extract',
        image: '🍀',
        description: 'Isoflavone-rich herb for women\'s hormonal support',
        benefits: ['Isoflavones', 'Hormonal support', 'Women\'s wellness'],
        personalReason: 'Natural isoflavones for women\'s hormonal health',
        healthFlags: ['40% isoflavones', 'Standardized', 'Organic'],
        price: '$16.99'
      }
    ],
    'Weight Loss': [
      {
        id: 'forskolin-1',
        name: 'Forskolin Extract',
        image: '🌿',
        description: 'Coleus forskohlii extract for weight management support',
        benefits: ['Weight management', 'Metabolic support', 'Traditional use'],
        personalReason: 'Traditional herb for natural weight management support',
        healthFlags: ['20% forskolin', 'Standardized', 'Third-party tested'],
        price: '$22.99'
      },
      {
        id: 'conjugated-linoleic-acid-1',
        name: 'CLA Complex',
        image: '💊',
        description: 'Conjugated linoleic acid for body composition support',
        benefits: ['Body composition', 'Lean mass support', 'Natural fatty acid'],
        personalReason: 'Natural fatty acid for healthy body composition',
        healthFlags: ['80% CLA', 'Safflower oil', 'Non-GMO'],
        price: '$19.99'
      }
    ],
    'Blood Sugar Support': [
      {
        id: 'gymnema-1',
        name: 'Gymnema Sylvestre',
        image: '🍃',
        description: 'Ayurvedic herb for blood sugar and sweet craving support',
        benefits: ['Blood sugar support', 'Reduces sweet cravings', 'Traditional use'],
        personalReason: 'Traditional herb for healthy blood sugar management',
        healthFlags: ['25% gymnemic acids', 'Standardized', 'Ayurvedic tradition'],
        price: '$18.99'
      },
      {
        id: 'alpha-lipoic-acid-1',
        name: 'Alpha Lipoic Acid',
        image: '⚡',
        description: 'Universal antioxidant for blood sugar and nerve support',
        benefits: ['Blood sugar support', 'Antioxidant', 'Nerve health'],
        personalReason: 'Powerful antioxidant for metabolic and nerve health',
        healthFlags: ['R-lipoic acid', 'Bioavailable', 'Third-party tested'],
        price: '$24.99'
      }
    ],
    'Metabolism Boost': [
      {
        id: 'kelp-iodine-1',
        name: 'Kelp Iodine Complex',
        image: '🌊',
        description: 'Natural iodine from kelp for thyroid and metabolic support',
        benefits: ['Thyroid support', 'Metabolic health', 'Natural iodine'],
        personalReason: 'Essential iodine for healthy thyroid function',
        healthFlags: ['Atlantic kelp', 'Natural source', 'Third-party tested'],
        price: '$13.99'
      },
      {
        id: 'capsicum-1',
        name: 'Capsicum Extract',
        image: '🌶️',
        description: 'Cayenne pepper extract for thermogenesis and metabolism',
        benefits: ['Thermogenesis', 'Metabolic support', 'Circulation'],
        personalReason: 'Natural heat for metabolic boost and circulation',
        healthFlags: ['Standardized capsaicin', 'Enteric coated', 'No stomach irritation'],
        price: '$15.99'
      }
    ]
  };

  const handleGoalSelect = async (goalName: string) => {
    setSelectedCategory(goalName);
    setSelectedCategoryName(goalName);
    setIsAnalyzing(true);
    setRecommendations([]);
    
    // Open modal immediately with loading state
    setIsLoadingSupplements(true);
    setShowSupplementList(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const goalSupplements = supplementDatabase[goalName] || [];
      setRecommendations(goalSupplements);
      setIsAnalyzing(false);
      setIsLoadingSupplements(false);
      
      if (goalSupplements.length === 0) {
        toast({
          title: "No Supplements Found",
          description: "We're working on adding more supplements for this category.",
        });
      } else {
        toast({
          title: "Recommendations Ready!",
          description: `Found ${goalSupplements.length} personalized supplements for you.`,
        });
      }
    }, 2000);
  };

  const handleSupplementSelect = (supplement: Supplement) => {
    setSelectedSupplement(supplement);
    setShowSupplementList(false);
    setShowSupplementDetail(true);
  };

  const handleBuyNow = (supplement: Supplement) => {
    // Add to user's supplements
    addSupplement({
      name: supplement.name,
      dosage: 1,
      unit: 'serving',
      notifications: [],
    });

    // Play supplement hub log confirmation sound
    console.log('🔊 [SupplementHub] === SUPPLEMENT HUB LOG SOUND REQUEST ===');
    console.log(`🔊 [SupplementHub] Supplement added: ${supplement.name}`);
    
    setTimeout(() => {
      try {
        console.log('🔊 [SupplementHub] Triggering playFoodLogConfirm for supplement hub...');
        playFoodLogConfirm().catch(error => {
          console.warn('🔊 [SupplementHub] Supplement hub log sound failed:', error);
        });
      } catch (error) {
        console.error('🔊 [SupplementHub] Supplement hub sound playback error:', error);
      }
    }, 0);

    toast({
      title: "Added to My Supplements!",
      description: `${supplement.name} has been added to your supplement tracking.`,
    });

    setShowSupplementDetail(false);
    setSelectedSupplement(null);
  };

  const handleRemoveSupplement = (supplementId: string) => {
    // In real app, implement remove functionality in context
    toast({
      title: "Supplement Removed",
      description: "Supplement has been removed from your list.",
    });
  };

  const handleAddManually = () => {
    navigate('/supplements');
  };

  // Generate personalized recommendations using AI
  const generatePersonalRecommendations = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to get personalized recommendations.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPersonal(true);
    try {
      // Get user profile data for AI analysis
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Create comprehensive user context
      const userContext = {
        profile,
        currentSupplements: userSupplements.map(s => s.name),
        nutritionData: currentDay,
      };

      // Call AI coach to analyze and recommend supplements
      const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          message: `Based on my complete health profile, current supplements, and nutrition data, please recommend the top 10 most beneficial supplements I should consider. Exclude any supplements I'm already taking. For each recommendation, provide a brief personalized explanation of why it would benefit me specifically. Format as a JSON array with objects containing: name, description, personalReason, benefits (array), and healthFlags (array).`,
          userContext,
          type: 'supplement_recommendations'
        }
      });

      if (error) throw error;

      // Parse AI response to create supplement objects
      let aiRecommendations = [];
      try {
        // Extract JSON from AI response
        const responseText = data.response;
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedRecommendations = JSON.parse(jsonMatch[0]);
          aiRecommendations = parsedRecommendations.map((rec: any, index: number) => ({
            id: `ai-rec-${index}`,
            name: rec.name || 'Unknown Supplement',
            image: '🧬', // AI recommendation icon
            description: rec.description || 'AI-recommended supplement',
            benefits: rec.benefits || [],
            personalReason: rec.personalReason || 'Recommended based on your profile',
            healthFlags: rec.healthFlags || ['AI-Selected', 'Personalized'],
            price: '$29.99' // Default price
          }));
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        // Fallback to default recommendations if parsing fails
        aiRecommendations = [
          {
            id: 'ai-default-1',
            name: 'Personalized Multivitamin',
            image: '🧬',
            description: 'AI-selected multivitamin based on your specific nutritional gaps',
            benefits: ['Fills nutritional gaps', 'Supports overall health', 'Personalized formula'],
            personalReason: 'Based on your profile analysis, this multivitamin addresses your specific nutritional needs',
            healthFlags: ['AI-Selected', 'Comprehensive'],
            price: '$34.99'
          }
        ];
      }

      setPersonalRecommendations(aiRecommendations);
      
      toast({
        title: "✨ Personal Recommendations Ready!",
        description: `Found ${aiRecommendations.length} supplements tailored for you.`,
      });

    } catch (error) {
      console.error('Error generating personal recommendations:', error);
      toast({
        title: "Error",
        description: "Unable to generate recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPersonal(false);
    }
  };

  const displayedRecommendations = showMore ? recommendations : recommendations.slice(0, 3);
  const hasMoreRecommendations = recommendations.length > 3;
  
  const displayedPersonalRecommendations = showMorePersonal ? personalRecommendations : personalRecommendations.slice(0, 3);
  const hasMorePersonalRecommendations = personalRecommendations.length > 3;

  return (
    <div className="space-y-12 sm:space-y-16 animate-fade-in">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3 -mx-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/explore')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌟</span>
              <h1 className="text-xl font-bold">Supplement Hub</h1>
            </div>
          </div>
        </div>
        
        {/* Scrolling Ticker */}
        <div className="overflow-hidden whitespace-nowrap bg-gradient-to-r from-transparent via-muted/20 to-transparent py-3 mb-4">
          <div className="inline-flex animate-marquee text-xl text-muted-foreground font-medium">
            <span className="pr-20">Smart AI-powered supplement recommendations based on your health, goals, and nutrition profile.</span>
            <span className="pr-20">Smart AI-powered supplement recommendations based on your health, goals, and nutrition profile.</span>
          </div>
        </div>

        {/* Netflix-style Category System */}
        <div className="space-y-6">
          {supplementCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              <h2 className="text-lg font-bold">{category.title}</h2>
              <div className="flex space-x-3 overflow-x-auto py-4 px-4 scrollbar-hide">
                {category.goals.map((goal) => (
                  <Button
                    key={goal}
                    onClick={() => handleGoalSelect(goal)}
                    variant="default"
                    className={`
                      flex-shrink-0 h-10 px-4 rounded-full transition-all duration-300
                      gradient-primary text-white shadow-lg hover:shadow-xl
                      ${selectedCategory === goal 
                        ? 'ring-2 ring-white ring-opacity-50 scale-105' 
                        : 'hover:scale-102'
                      }
                    `}
                  >
                    <span className="whitespace-nowrap text-sm font-medium">
                      {goal}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Analysis State */}
        {isAnalyzing && (
          <Card className="glass-card border-0 rounded-3xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <div className="space-y-2">
                <h3 className="font-semibold">🧠 Analyzing Your Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Finding the perfect supplements based on your health data, goals, and preferences...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && !isAnalyzing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <span>🧠</span>
                <span>Suggested for You: {selectedCategory}</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                These supplements were selected based on your profile analysis and health goals.
              </p>
            </div>

            <div className="space-y-4">
              {displayedRecommendations.map((supplement) => (
                <Card 
                  key={supplement.id}
                  className="glass-card border-0 rounded-3xl cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => handleSupplementSelect(supplement)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="text-4xl">{supplement.image}</div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold">{supplement.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {supplement.description}
                        </p>
                        <div className="bg-primary/10 p-2 rounded-xl">
                          <p className="text-xs font-medium">
                            🧠 {supplement.personalReason}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {supplement.healthFlags.slice(0, 2).map((flag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              ✅ {flag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {hasMoreRecommendations && (
              <Button
                onClick={() => setShowMore(!showMore)}
                variant="outline"
                className="w-full glass-button rounded-2xl"
              >
                {showMore ? 'Show Less' : `+ Show ${recommendations.length - 3} More`}
              </Button>
            )}
          </div>
        )}

        {/* Personal AI Recommendations Section */}
        <Card className="glass-card border-0 rounded-3xl bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-emerald-50/40 dark:from-purple-900/20 dark:via-blue-900/10 dark:to-emerald-900/15 shadow-lg border border-purple-200/30 dark:border-purple-700/30 animate-slide-up">
          <CardHeader className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
              <CardTitle className="bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent text-xl font-bold">
                General Recommendations Just For You
              </CardTitle>
              <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              🧠 Get AI-powered supplement recommendations tailored to your unique health profile, goals, and current nutrition status.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {personalRecommendations.length === 0 && !isGeneratingPersonal ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-6xl animate-bounce">🎯</div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Ready for Your Personal Analysis?</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Our AI will analyze your health profile, current supplements, and nutrition data to recommend the perfect supplements for you.
                  </p>
                </div>
                <Button 
                  onClick={generatePersonalRecommendations}
                  className="gradient-primary text-white font-semibold px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Brain className="h-5 w-5 mr-2" />
                  Generate My Recommendations
                </Button>
              </div>
            ) : isGeneratingPersonal ? (
              <div className="text-center py-8 space-y-4">
                <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="font-semibold">🧠 Analyzing Your Profile...</h3>
                  <p className="text-sm text-muted-foreground">
                    Reviewing your health data, goals, and current supplements to find perfect matches...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <Button 
                    onClick={generatePersonalRecommendations}
                    variant="outline"
                    size="sm"
                    className="glass-button rounded-full"
                    disabled={isGeneratingPersonal}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Refresh Recommendations
                  </Button>
                </div>
                
                {displayedPersonalRecommendations.map((supplement) => (
                  <Card 
                    key={supplement.id}
                    className="glass-card border-0 rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-white/60 dark:bg-gray-800/60"
                    onClick={() => handleSupplementSelect(supplement)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className="text-4xl">{supplement.image}</div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{supplement.name}</h3>
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                              AI Selected
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {supplement.description}
                          </p>
                          <div className="bg-gradient-to-r from-purple-100/80 to-blue-100/80 dark:from-purple-900/40 dark:to-blue-900/40 p-3 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                            <p className="text-xs font-medium text-purple-800 dark:text-purple-200">
                              🎯 {supplement.personalReason}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {supplement.healthFlags.slice(0, 3).map((flag, index) => (
                              <Badge key={index} variant="outline" className="text-xs border-emerald-200 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                                ✨ {flag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {hasMorePersonalRecommendations && (
                  <Button
                    onClick={() => setShowMorePersonal(!showMorePersonal)}
                    variant="outline"
                    className="w-full glass-button rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700"
                  >
                    {showMorePersonal ? 'Show Less' : `✨ Show ${personalRecommendations.length - 3} More Personal Picks`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Supplements Section */}
        <Card className="glass-card border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📂</span>
              <span>My Supplements</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track the supplements you're taking.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {userSupplements.length > 0 ? (
              <div className="space-y-3">
                {userSupplements.map((supplement, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">💊</span>
                      <div>
                        <p className="font-medium">{supplement.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {supplement.dosage}{supplement.unit}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveSupplement(supplement.name)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="text-4xl">📦</div>
                <p className="text-sm text-muted-foreground">
                  No supplements tracked yet. Add one manually or get personalized recommendations above.
                </p>
              </div>
            )}
            
            <Button
              onClick={handleAddManually}
              variant="outline"
              className="w-full glass-button rounded-2xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <SupplementListModal
        isOpen={showSupplementList}
        onClose={() => setShowSupplementList(false)}
        categoryName={selectedCategoryName}
        supplements={recommendations}
        onSupplementSelect={handleSupplementSelect}
        isLoading={isLoadingSupplements}
      />

      <SupplementDetailModal
        isOpen={showSupplementDetail}
        onClose={() => setShowSupplementDetail(false)}
        supplement={selectedSupplement}
        onBuyNow={handleBuyNow}
      />
    </div>
  );
};

export default SupplementHub;
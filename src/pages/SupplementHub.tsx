import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Heart, Zap, Brain, Dumbbell, Shield, Utensils, Flame, Moon, User, Smile } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useToast } from '@/hooks/use-toast';

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
  
  const userSupplements = currentDay.supplements;
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [recommendations, setRecommendations] = useState<Supplement[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      title: '🔥 Energy & Performance',
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

  // Mock supplement database - updated for new goal system
  const supplementDatabase: Record<string, Supplement[]> = {
    // Muscle Growth & Weight Gain supplements
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
      }
    ],
    
    // Weight Loss & Fat Burn supplements
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
      }
    ],
    
    // Existing supplements
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
      }
    ],
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
      }
    ]
  };

  const handleGoalSelect = async (goalName: string) => {
    setSelectedCategory(goalName);
    setIsAnalyzing(true);
    setRecommendations([]);
    
    // Simulate AI analysis
    setTimeout(() => {
      const goalSupplements = supplementDatabase[goalName] || [];
      const topRecommendations = goalSupplements.slice(0, 3);
      setRecommendations(goalSupplements);
      setIsAnalyzing(false);
      
      if (topRecommendations.length > 0) {
        toast({
          title: "Recommendations Ready!",
          description: `Found ${topRecommendations.length} personalized supplements for you.`,
        });
      }
    }, 2000);
  };

  const handleSupplementSelect = (supplement: Supplement) => {
    setSelectedSupplement(supplement);
  };

  const handleBuyNow = (supplement: Supplement) => {
    // Add to user's supplements
    addSupplement({
      name: supplement.name,
      dosage: 1,
      unit: 'serving',
      notifications: [],
    });

    toast({
      title: "Added to My Supplements!",
      description: `${supplement.name} has been added to your supplement tracking.`,
    });

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

  const displayedRecommendations = showMore ? recommendations : recommendations.slice(0, 3);
  const hasMoreRecommendations = recommendations.length > 3;

  if (selectedSupplement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 pb-32">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSupplement(null)}
              className="rounded-full glass-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Supplement Details</h1>
          </div>

          {/* Supplement Detail Card */}
          <Card className="glass-card border-0 rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
              {/* Image and Name */}
              <div className="text-center space-y-4">
                <div className="text-6xl">{selectedSupplement.image}</div>
                <h2 className="text-2xl font-bold">{selectedSupplement.name}</h2>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Description</h3>
                <p className="text-muted-foreground">{selectedSupplement.description}</p>
              </div>

              {/* Key Benefits */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Key Benefits</h3>
                <ul className="space-y-1">
                  {selectedSupplement.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Personal Reason */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center space-x-2">
                  <span>🧠</span>
                  <span>Why this is uniquely good for you</span>
                </h3>
                <p className="text-sm bg-primary/10 p-3 rounded-2xl">
                  {selectedSupplement.personalReason}
                </p>
              </div>

              {/* Health Flags */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Verified Health Flags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedSupplement.healthFlags.map((flag, index) => (
                    <Badge key={index} variant="secondary" className="rounded-full">
                      ✅ {flag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Study Links */}
              {selectedSupplement.studyLinks && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Scientific Sources</h3>
                  {selectedSupplement.studyLinks.map((link, index) => (
                    <a
                      key={index}
                      href={`https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-primary hover:underline"
                    >
                      📚 Study {index + 1}
                    </a>
                  ))}
                </div>
              )}

              {/* Buy Now Button */}
              <Button
                onClick={() => handleBuyNow(selectedSupplement)}
                className="w-full h-14 text-lg font-bold gradient-primary text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
              >
                💚 Buy Now {selectedSupplement.price && `- ${selectedSupplement.price}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 sm:space-y-16 animate-fade-in">
      <div className="max-w-md mx-auto space-y-6">
        {/* Compact Header with Back Button and Title */}
        <div className="flex items-center justify-between py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/explore')}
            className="rounded-full glass-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 dark:from-gray-100 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent text-center flex-1`}>
            <span className="text-yellow-400 drop-shadow-lg animate-pulse">🌟</span> Your Personalized Supplement Hub
          </h1>
          
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>
        
        {/* Scrolling Ticker */}
        <div className="overflow-hidden whitespace-nowrap bg-gradient-to-r from-transparent via-muted/20 to-transparent py-3 mb-4">
          <div className="animate-[marquee_8s_linear_infinite] text-3xl text-muted-foreground font-medium">
            Smart AI-powered supplement recommendations based on your health, goals, and nutrition profile.
          </div>
        </div>

        {/* Netflix-style Category System */}
        <div className="space-y-6">
          {supplementCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              <h2 className="text-lg font-bold">{category.title}</h2>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                {category.goals.map((goal) => (
                  <Button
                    key={goal}
                    onClick={() => handleGoalSelect(goal)}
                    variant={selectedCategory === goal ? "default" : "outline"}
                    className={`
                      flex-shrink-0 h-10 px-4 rounded-full transition-all duration-300
                      ${selectedCategory === goal 
                        ? 'gradient-primary text-white shadow-lg' 
                        : 'glass-button hover:shadow-md'
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
    </div>
  );
};

export default SupplementHub;
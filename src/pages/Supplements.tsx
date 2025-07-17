import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Camera, Upload, Plus, Pill, Zap, Heart, Brain, Shield, 
  Sun, Bone, ChevronDown, X, ExternalLink, ShoppingCart,
  Star, Clock, Moon, Target, Dumbbell
} from 'lucide-react';
import { useNutrition } from '@/contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';

// Supplement categories and their recommendations
const supplementCategories = [
  { 
    id: 'heart-health', 
    name: 'Heart Health', 
    icon: Heart, 
    color: 'from-red-500 to-pink-500',
    supplements: [
      {
        name: 'Omega-3 Fish Oil',
        benefit: 'Supports cardiovascular health and reduces inflammation',
        personalReason: 'Based on your age and activity level, Omega-3s can help maintain healthy cholesterol levels.',
        image: '/placeholder.svg',
        description: 'High-quality fish oil supplement containing EPA and DHA omega-3 fatty acids.',
        keyBenefits: ['Reduces inflammation', 'Supports heart health', 'Improves brain function'],
        healthFlags: ['Mercury-free', 'Molecularly distilled'],
        studyLinks: ['https://example.com/omega3-study'],
        price: '$24.99'
      },
      {
        name: 'CoQ10',
        benefit: 'Supports cellular energy production and heart function',
        personalReason: 'Your fitness goals indicate you could benefit from enhanced cellular energy.',
        image: '/placeholder.svg',
        description: 'Coenzyme Q10 supplement for cardiovascular and cellular health.',
        keyBenefits: ['Supports heart health', 'Enhances energy production', 'Antioxidant properties'],
        healthFlags: ['Non-GMO', 'Third-party tested'],
        studyLinks: ['https://example.com/coq10-study'],
        price: '$32.99'
      },
      {
        name: 'Magnesium Glycinate',
        benefit: 'Supports heart rhythm and muscle function',
        personalReason: 'Based on your stress levels, magnesium can help with relaxation and heart health.',
        image: '/placeholder.svg',
        description: 'Highly bioavailable form of magnesium for optimal absorption.',
        keyBenefits: ['Supports muscle function', 'Promotes relaxation', 'Heart rhythm support'],
        healthFlags: ['Chelated form', 'Easy on stomach'],
        studyLinks: ['https://example.com/magnesium-study'],
        price: '$19.99'
      }
    ]
  },
  { 
    id: 'energy-boost', 
    name: 'Energy Boost', 
    icon: Zap, 
    color: 'from-yellow-500 to-orange-500',
    supplements: [
      {
        name: 'B-Complex',
        benefit: 'Supports energy metabolism and nervous system',
        personalReason: 'Your busy lifestyle suggests you need comprehensive B-vitamin support.',
        image: '/placeholder.svg',
        description: 'Complete B-vitamin complex for energy and nervous system support.',
        keyBenefits: ['Energy metabolism', 'Nervous system support', 'Stress management'],
        healthFlags: ['Methylated forms', 'High potency'],
        studyLinks: ['https://example.com/b-complex-study'],
        price: '$21.99'
      },
      {
        name: 'Iron Bisglycinate',
        benefit: 'Supports oxygen transport and energy levels',
        personalReason: 'Based on your gender and activity level, iron support may benefit your energy.',
        image: '/placeholder.svg',
        description: 'Gentle, highly absorbable form of iron supplement.',
        keyBenefits: ['Oxygen transport', 'Energy production', 'Immune support'],
        healthFlags: ['Gentle on stomach', 'High absorption'],
        studyLinks: ['https://example.com/iron-study'],
        price: '$16.99'
      },
      {
        name: 'Rhodiola Rosea',
        benefit: 'Adaptogenic herb for stress and energy support',
        personalReason: 'Your stress levels indicate adaptogens could help with sustained energy.',
        image: '/placeholder.svg',
        description: 'Premium rhodiola extract for stress adaptation and energy.',
        keyBenefits: ['Stress adaptation', 'Mental energy', 'Endurance support'],
        healthFlags: ['Standardized extract', 'Organic'],
        studyLinks: ['https://example.com/rhodiola-study'],
        price: '$28.99'
      }
    ]
  },
  { 
    id: 'brain-function', 
    name: 'Brain Function', 
    icon: Brain, 
    color: 'from-purple-500 to-indigo-500',
    supplements: [
      {
        name: 'Lion\'s Mane Mushroom',
        benefit: 'Supports cognitive function and nerve growth',
        personalReason: 'Your mental performance goals suggest cognitive support supplements.',
        image: '/placeholder.svg',
        description: 'Organic lion\'s mane mushroom extract for brain health.',
        keyBenefits: ['Cognitive support', 'Nerve growth factor', 'Memory enhancement'],
        healthFlags: ['Organic', 'Dual-extracted'],
        studyLinks: ['https://example.com/lions-mane-study'],
        price: '$34.99'
      }
    ]
  },
  { 
    id: 'muscle-build', 
    name: 'Muscle Build', 
    icon: Dumbbell, 
    color: 'from-blue-500 to-cyan-500',
    supplements: [
      {
        name: 'Whey Protein Isolate',
        benefit: 'High-quality protein for muscle building and recovery',
        personalReason: 'Your fitness goals and protein intake suggest additional protein support.',
        image: '/placeholder.svg',
        description: 'Premium whey protein isolate with complete amino acid profile.',
        keyBenefits: ['Muscle building', 'Recovery support', 'Complete protein'],
        healthFlags: ['Grass-fed', 'No artificial flavors'],
        studyLinks: ['https://example.com/whey-protein-study'],
        price: '$49.99'
      }
    ]
  },
  { 
    id: 'immune-support', 
    name: 'Immune Support', 
    icon: Shield, 
    color: 'from-green-500 to-emerald-500',
    supplements: [
      {
        name: 'Vitamin D3 + K2',
        benefit: 'Supports immune function and bone health',
        personalReason: 'Your location and lifestyle may limit sun exposure, making D3 beneficial.',
        image: '/placeholder.svg',
        description: 'Synergistic combination of vitamin D3 and K2 for optimal absorption.',
        keyBenefits: ['Immune support', 'Bone health', 'Calcium regulation'],
        healthFlags: ['Cholecalciferol form', 'MK-7 K2'],
        studyLinks: ['https://example.com/vitamin-d-study'],
        price: '$22.99'
      }
    ]
  },
  { 
    id: 'gut-health', 
    name: 'Gut Health', 
    icon: Target, 
    color: 'from-teal-500 to-green-500',
    supplements: [
      {
        name: 'Multi-Strain Probiotic',
        benefit: 'Supports digestive health and immune function',
        personalReason: 'Your digestive patterns suggest probiotic support could be beneficial.',
        image: '/placeholder.svg',
        description: '50 billion CFU multi-strain probiotic for gut health.',
        keyBenefits: ['Digestive support', 'Immune function', 'Gut microbiome'],
        healthFlags: ['Shelf-stable', 'Delayed-release'],
        studyLinks: ['https://example.com/probiotic-study'],
        price: '$39.99'
      }
    ]
  },
  { 
    id: 'weight-loss', 
    name: 'Weight Loss', 
    icon: Target, 
    color: 'from-pink-500 to-rose-500',
    supplements: [
      {
        name: 'Green Tea Extract',
        benefit: 'Supports metabolism and fat oxidation',
        personalReason: 'Your weight goals suggest metabolic support supplements.',
        image: '/placeholder.svg',
        description: 'Standardized green tea extract with EGCG for metabolic support.',
        keyBenefits: ['Metabolic support', 'Antioxidant properties', 'Fat oxidation'],
        healthFlags: ['Caffeine-free option', 'Standardized'],
        studyLinks: ['https://example.com/green-tea-study'],
        price: '$26.99'
      }
    ]
  },
  { 
    id: 'sleep-recovery', 
    name: 'Sleep & Recovery', 
    icon: Moon, 
    color: 'from-indigo-500 to-purple-500',
    supplements: [
      {
        name: 'Melatonin 3mg',
        benefit: 'Supports natural sleep cycle regulation',
        personalReason: 'Your sleep patterns suggest melatonin could help improve sleep quality.',
        image: '/placeholder.svg',
        description: 'Natural melatonin supplement for sleep cycle support.',
        keyBenefits: ['Sleep regulation', 'Circadian rhythm', 'Recovery support'],
        healthFlags: ['Natural', 'Non-habit forming'],
        studyLinks: ['https://example.com/melatonin-study'],
        price: '$14.99'
      }
    ]
  },
  { 
    id: 'hormonal-balance', 
    name: 'Hormonal Balance', 
    icon: Sun, 
    color: 'from-amber-500 to-yellow-500',
    supplements: [
      {
        name: 'Ashwagandha',
        benefit: 'Adaptogenic herb for stress and hormone support',
        personalReason: 'Your stress levels suggest adaptogenic support for hormone balance.',
        image: '/placeholder.svg',
        description: 'KSM-66 ashwagandha extract for stress and hormone support.',
        keyBenefits: ['Stress adaptation', 'Hormone balance', 'Energy support'],
        healthFlags: ['KSM-66 extract', 'Third-party tested'],
        studyLinks: ['https://example.com/ashwagandha-study'],
        price: '$31.99'
      }
    ]
  },
  { 
    id: 'mood-stress', 
    name: 'Mood & Stress Relief', 
    icon: Star, 
    color: 'from-violet-500 to-purple-500',
    supplements: [
      {
        name: 'L-Theanine',
        benefit: 'Promotes calm focus and stress relief',
        personalReason: 'Your stress patterns suggest L-theanine for calm, focused energy.',
        image: '/placeholder.svg',
        description: 'Pure L-theanine amino acid for calm focus and relaxation.',
        keyBenefits: ['Calm focus', 'Stress relief', 'Sleep quality'],
        healthFlags: ['Pure amino acid', 'Non-drowsy'],
        studyLinks: ['https://example.com/l-theanine-study'],
        price: '$18.99'
      }
    ]
  }
];

const Supplements = () => {
  const [selectedCategory, setSelectedCategory] = useState('heart-health');
  const [selectedSupplement, setSelectedSupplement] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [userSupplements, setUserSupplements] = useState([
    { name: 'Vitamin D3', dosage: '2000 IU', frequency: 'Daily' },
    { name: 'Omega-3', dosage: '1000mg', frequency: 'Daily' }
  ]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [newSupplement, setNewSupplement] = useState({ name: '', dosage: '', frequency: 'Daily' });

  const { addSupplement } = useNutrition();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const currentCategory = supplementCategories.find(cat => cat.id === selectedCategory);
  const recommendations = currentCategory?.supplements || [];
  const displayedRecommendations = showMore ? recommendations : recommendations.slice(0, 3);

  const handleSupplementClick = (supplement) => {
    setSelectedSupplement(supplement);
  };

  const handleBuyNow = (supplement) => {
    // Add to user supplements
    setUserSupplements(prev => [...prev, {
      name: supplement.name,
      dosage: supplement.keyBenefits[0], // Use first benefit as dosage placeholder
      frequency: 'Daily'
    }]);

    // Add to nutrition tracking
    addSupplement({
      name: supplement.name,
      dosage: 1,
      unit: 'tablet',
      notifications: [],
    });

    toast({
      title: "Supplement Added!",
      description: `${supplement.name} has been added to your supplements.`,
    });

    setSelectedSupplement(null);
  };

  const handleManualAdd = () => {
    if (!newSupplement.name) {
      toast({
        title: "Error",
        description: "Please enter a supplement name.",
        variant: "destructive",
      });
      return;
    }

    setUserSupplements(prev => [...prev, newSupplement]);
    setNewSupplement({ name: '', dosage: '', frequency: 'Daily' });
    setShowManualAdd(false);

    toast({
      title: "Supplement Added!",
      description: `${newSupplement.name} has been added to your list.`,
    });
  };

  const removeSupplement = (index) => {
    setUserSupplements(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Supplement Removed",
      description: "Supplement has been removed from your list.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      {/* Title Section - Styled like Home page */}
      <div className="text-center space-y-4 py-6">
        <h1 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold bg-gradient-to-r from-gray-900 via-emerald-600 to-blue-600 dark:from-gray-100 dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent`}>
          🌟 Your Personalized Supplement Hub
        </h1>
        
        {/* Scrolling Ticker Subtitle */}
        <div className="overflow-hidden bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-full py-2">
          <div className="animate-scroll whitespace-nowrap">
            <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300 font-medium`}>
              Smart AI-powered supplement recommendations based on your health, goals, and nutrition profile. • 
              Personalized for your unique needs • Evidence-based suggestions • 
              Smart AI-powered supplement recommendations based on your health, goals, and nutrition profile. • 
            </span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4">
        <div className="overflow-x-auto pb-2">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="inline-flex w-max bg-glass-white border border-white/20 rounded-2xl p-1">
              {supplementCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${isMobile ? 'text-xs' : 'text-sm'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{category.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Supplement Recommendations */}
      <div className="px-4 space-y-4">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
          Recommended for You
        </h2>
        
        <div className="space-y-3">
          {displayedRecommendations.map((supplement, index) => (
            <Card 
              key={index}
              className="glass-card border-0 rounded-2xl cursor-pointer hover:scale-[1.02] transition-all duration-300"
              onClick={() => handleSupplementClick(supplement)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center">
                    <Pill className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                      {supplement.name}
                    </h3>
                    <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-base'} mb-2`}>
                      {supplement.benefit}
                    </p>
                    <p className={`text-emerald-600 dark:text-emerald-400 ${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>
                      💡 {supplement.personalReason}
                    </p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-gray-400 transform rotate-[-90deg]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {recommendations.length > 3 && (
          <Button
            variant="ghost"
            onClick={() => setShowMore(!showMore)}
            className="w-full text-emerald-600 dark:text-emerald-400"
          >
            {showMore ? 'Show Less' : `+ Show ${recommendations.length - 3} More`}
          </Button>
        )}
      </div>

      {/* My Supplements Section */}
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
            My Supplements
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualAdd(true)}
            className="text-emerald-600 dark:text-emerald-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Manually
          </Button>
        </div>

        <div className="space-y-3">
          {userSupplements.map((supplement, index) => (
            <Card key={index} className="glass-card border-0 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                      <Pill className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {supplement.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {supplement.dosage} • {supplement.frequency}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSupplement(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {userSupplements.length === 0 && (
            <Card className="glass-card border-0 rounded-2xl border-dashed border-gray-300 dark:border-gray-600">
              <CardContent className="p-8 text-center">
                <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No supplements added yet. Add one above or use our recommendations!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Supplement Detail Modal */}
      {selectedSupplement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto glass-card border-0 rounded-3xl">
            <CardHeader className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSupplement(null)}
                className="absolute right-4 top-4 z-10"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="w-full h-32 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center mb-4">
                <Pill className="h-16 w-16 text-white" />
              </div>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">
                {selectedSupplement.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-300">{selectedSupplement.description}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Key Benefits</h3>
                <ul className="space-y-1">
                  {selectedSupplement.keyBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Why It's Great for You</h3>
                <p className="text-emerald-600 dark:text-emerald-400">{selectedSupplement.personalReason}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Health Flags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedSupplement.healthFlags.map((flag, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm">
                      {flag}
                    </span>
                  ))}
                </div>
              </div>

              {selectedSupplement.studyLinks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Research</h3>
                  {selectedSupplement.studyLinks.map((link, index) => (
                    <Button key={index} variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 p-0">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Study {index + 1}
                    </Button>
                  ))}
                </div>
              )}

              <Button
                onClick={() => handleBuyNow(selectedSupplement)}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold rounded-2xl"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to My Supplements • {selectedSupplement.price}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Add Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md glass-card border-0 rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-gray-900 dark:text-white">Add Supplement</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualAdd(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Supplement Name</Label>
                <Input
                  id="name"
                  value={newSupplement.name}
                  onChange={(e) => setNewSupplement(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Vitamin C"
                  className="glass-button border-0"
                />
              </div>
              <div>
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  value={newSupplement.dosage}
                  onChange={(e) => setNewSupplement(prev => ({ ...prev, dosage: e.target.value }))}
                  placeholder="e.g., 500mg"
                  className="glass-button border-0"
                />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <select
                  id="frequency"
                  value={newSupplement.frequency}
                  onChange={(e) => setNewSupplement(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full p-3 glass-button border-0 rounded-xl bg-white/50 dark:bg-white/10"
                >
                  <option value="Daily">Daily</option>
                  <option value="Twice Daily">Twice Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="As Needed">As Needed</option>
                </select>
              </div>
              <Button
                onClick={handleManualAdd}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold rounded-2xl"
              >
                Add Supplement
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Supplements;
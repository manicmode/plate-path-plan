import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Lightbulb,
  Save,
  Flag,
  RotateCcw,
  Star
} from 'lucide-react';
import { HealthAnalysisResult } from './HealthCheckModal';

interface HealthReportPopupProps {
  result: HealthAnalysisResult;
  onScanAnother: () => void;
  onClose: () => void;
}

export const HealthReportPopup: React.FC<HealthReportPopupProps> = ({
  result,
  onScanAnother,
  onClose
}) => {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-400 border-green-400 bg-green-400/10';
      case 'good': return 'text-blue-400 border-blue-400 bg-blue-400/10';
      case 'fair': return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
      case 'poor': return 'text-orange-400 border-orange-400 bg-orange-400/10';
      case 'avoid': return 'text-red-400 border-red-400 bg-red-400/10';
      default: return 'text-gray-400 border-gray-400 bg-gray-400/10';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'excellent': return <CheckCircle className="w-6 h-6" />;
      case 'good': return <Heart className="w-6 h-6" />;
      case 'fair': return <Info className="w-6 h-6" />;
      case 'poor': return <AlertTriangle className="w-6 h-6" />;
      case 'avoid': return <XCircle className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="text-4xl">🧬</div>
            <h1 className="text-3xl font-bold text-white">Health Report</h1>
          </div>
          
          <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">{result.itemName}</h2>
              
              {/* Health Score */}
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">{result.healthScore}</div>
                  <div className="text-sm text-gray-300">Health Score</div>
                </div>
                
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${getRatingColor(result.overallRating)}`}>
                  {getRatingIcon(result.overallRating)}
                  <span className="font-bold capitalize">{result.overallRating}</span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-6 h-6 ${i < Math.ceil(result.healthScore / 20) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nutrition Data */}
        {result.nutritionData && (
          <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <div className="text-2xl mr-2">📊</div>
                Nutrition Facts
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(result.nutritionData).map(([key, value]) => {
                  if (value === undefined || value === null) return null;
                  return (
                    <div key={key} className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-2xl font-bold text-white">{value}</div>
                      <div className="text-sm text-gray-300 capitalize">
                        {key === 'calories' ? 'cal' : key === 'sodium' ? 'mg' : 'g'}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">{key}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Health Profile */}
        <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <div className="text-2xl mr-2">🔍</div>
              Health Profile
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className={`w-5 h-5 ${result.healthProfile.isOrganic ? 'text-green-400' : 'text-gray-400'}`} />
                  <span className="text-white">Organic: {result.healthProfile.isOrganic ? 'Yes' : 'No'}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <XCircle className={`w-5 h-5 ${result.healthProfile.isGMO ? 'text-red-400' : 'text-green-400'}`} />
                  <span className="text-white">GMO: {result.healthProfile.isGMO ? 'Yes' : 'No'}</span>
                </div>
              </div>
              
              {result.healthProfile.allergens && result.healthProfile.allergens.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-2">Allergens:</div>
                  <div className="space-y-1">
                    {result.healthProfile.allergens.map((allergen, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {result.healthProfile.additives && result.healthProfile.additives.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-2">Additives:</div>
                  <div className="space-y-1">
                    {result.healthProfile.additives.map((additive, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-yellow-400 text-yellow-400">
                        {additive}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ingredient Flags */}
        {result.ingredientFlags.length > 0 && (
          <Card className="bg-black/40 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mr-2" />
                Ingredient Flags
              </h3>
              
              <div className="space-y-3">
                {result.ingredientFlags.map((flag, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <div className="font-medium text-white">{flag.ingredient}</div>
                      <div className="text-sm text-gray-300">{flag.flag}</div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(flag.severity)}`}></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warnings */}
        {result.personalizedWarnings.length > 0 && (
          <Card className="bg-red-900/20 border-red-400/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-red-300 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2" />
                Personalized Warnings
              </h3>
              
              <div className="space-y-2">
                {result.personalizedWarnings.map((warning, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-red-200">{warning}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <Card className="bg-green-900/20 border-green-400/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-green-300 mb-4 flex items-center">
                <Lightbulb className="w-6 h-6 mr-2" />
                Suggestions
              </h3>
              
              <div className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-green-200">{suggestion}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <Button
            onClick={() => {/* Handle save to log */}}
            className="bg-green-600 hover:bg-green-700 text-white py-3"
          >
            <Save className="w-5 h-5 mr-2" />
            👍 Save to Log
          </Button>
          
          <Button
            onClick={() => {/* Handle flag item */}}
            variant="outline"
            className="border-red-400 text-red-400 hover:bg-red-400/10 py-3"
          >
            <Flag className="w-5 h-5 mr-2" />
            🚫 Flag Item
          </Button>
          
          <Button
            onClick={onScanAnother}
            variant="outline"
            className="border-blue-400 text-blue-400 hover:bg-blue-400/10 py-3"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            🔁 Scan Another
          </Button>
        </div>
      </div>
    </div>
  );
};
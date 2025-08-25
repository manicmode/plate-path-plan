import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RefreshCw, Search, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface HealthInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  icon: string;
  priority: number;
}

interface NextAction {
  action: 'confirm' | 'retake' | 'manual_search' | 'good_to_go' | 'avoid';
  title: string;
  description: string;
  buttons: ActionButton[];
}

interface ActionButton {
  label: string;
  action: string;
  variant: 'primary' | 'secondary' | 'danger';
}

interface ScanResult {
  success: boolean;
  confidence: number;
  product?: {
    name: string;
    brand?: string;
    category: string;
  };
  plateItems?: Array<{
    name: string;
    category: string;
    confirmed: boolean;
  }>;
  insights: HealthInsight[];
  nextAction: NextAction;
  metadata: {
    processingTime: number;
  };
}

interface ResultCardProps {
  result: ScanResult;
  onAction: (action: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onAction }) => {
  const getInsightIcon = (insight: HealthInsight) => {
    switch (insight.type) {
      case 'positive': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'negative': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getButtonVariant = (variant: string) => {
    switch (variant) {
      case 'primary': return 'default';
      case 'danger': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="w-full max-h-screen overflow-y-auto bg-background">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="text-2xl">🔬</div>
            <h1 className="text-2xl font-bold text-foreground">Health Analysis</h1>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Badge variant={result.confidence > 0.7 ? 'default' : 'secondary'}>
              {Math.round(result.confidence * 100)}% Confidence
            </Badge>
            <Badge variant="outline">
              {result.metadata.processingTime}ms
            </Badge>
          </div>
        </div>

        {/* Product/Food Info */}
        {result.product && (
          <Card className="p-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{result.product.name}</h3>
              {result.product.brand && (
                <p className="text-muted-foreground">Brand: {result.product.brand}</p>
              )}
              <Badge variant="secondary">{result.product.category}</Badge>
            </div>
          </Card>
        )}

        {/* Plate Items */}
        {result.plateItems && result.plateItems.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Detected Food Items</h3>
            <div className="space-y-2">
              {result.plateItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded border">
                  <span>{item.name}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={item.confirmed ? 'default' : 'secondary'}>
                      {item.category}
                    </Badge>
                    {!item.confirmed && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onAction(`confirm_item_${index}`)}
                      >
                        Confirm
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Health Insights */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center space-x-2">
            <span>💡</span>
            <span>Health Insights</span>
          </h3>
          
          {result.insights.map((insight, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getInsightIcon(insight)}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-medium">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
                <div className="text-xl">{insight.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Next Action */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">{result.nextAction.title}</h3>
              <p className="text-muted-foreground">{result.nextAction.description}</p>
            </div>
            
            <div className="flex flex-col space-y-2">
              {result.nextAction.buttons.map((button, index) => (
                <Button
                  key={index}
                  variant={getButtonVariant(button.variant) as any}
                  onClick={() => onAction(button.action)}
                  className="w-full"
                >
                  {button.action === 'retake' && <RefreshCw className="w-4 h-4 mr-2" />}
                  {button.action === 'manual_search' && <Search className="w-4 h-4 mr-2" />}
                  {button.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
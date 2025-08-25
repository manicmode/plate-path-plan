import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RefreshCw, Search, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ScanResult } from '@/types/healthScan';

interface ResultCardProps {
  scan: ScanResult;
  requestId?: string;
  onRetake: () => void;
  onManualSearch: () => void;
  onConfirmItems: () => void;
  onChoosePortion: () => void;
  onOpenFacts: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  scan,
  requestId,
  onRetake,
  onManualSearch,
  onConfirmItems,
  onChoosePortion,
  onOpenFacts,
}) => {
  const { insights, flags, productMatch, nextActions, status, quality } = scan;

  function handleAction(a: typeof nextActions[number]) {
    switch (a.action) {
      case "retake": onRetake(); break;
      case "manual_search": onManualSearch(); break;
      case "confirm_item": onConfirmItems(); break;
      case "choose_portion": onChoosePortion(); break;
      case "open_facts": onOpenFacts(); break;
    }
  }

  return (
    <div className="rounded-2xl p-4 shadow bg-background">
      {status === "needs_retake" && (
        <p className="text-amber-600 mb-4">Photo looks blurry. Try a closer, steadier shot.</p>
      )}
      
      {productMatch && (
        <div className="mb-3">
          <div className="text-sm text-muted-foreground">
            {productMatch.source === "generic" ? "Generic match" : "Product"}
          </div>
          <div className="text-lg font-semibold">
            {productMatch.brand} {productMatch.productName}
          </div>
        </div>
      )}
      
      {!!flags?.length && (
        <div className="mb-3">
          <h4 className="font-medium mb-2">Health Flags</h4>
          <ul className="list-disc ml-4 space-y-1">
            {flags.map((f, i) => (
              <li key={i}>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${
                  f.severity === 'high' ? 'bg-red-100 text-red-800' :
                  f.severity === 'med' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {f.severity}
                </span>
                {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {!!insights?.length && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Health Insights</h4>
          <ul className="list-disc ml-4 space-y-1">
            {insights.map((t, i) => <li key={i} className="text-sm">{t}</li>)}
          </ul>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-3">
        {nextActions.map((a, i) => (
          <Button key={i} onClick={() => handleAction(a)} variant="outline">
            {a.action === 'retake' && <RefreshCw className="w-4 h-4 mr-2" />}
            {a.action === 'manual_search' && <Search className="w-4 h-4 mr-2" />}
            {a.label}
          </Button>
        ))}
      </div>
      
      {requestId && (
        <div className="mt-3 text-xs text-muted-foreground">Request ID: {requestId}</div>
      )}
      {quality && (
        <div className="mt-1 text-xs text-muted-foreground">
          Image {quality.width}×{quality.height} • blur {Math.round(quality.blurScore)}
        </div>
      )}
    </div>
  );
};
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProbeResult {
  ok: boolean;
  echo: {
    w: number;
    h: number;
    sha256: string;
    bytes: number;
  };
  google: {
    ocr_ok: boolean;
    ocr_chars: number;
    ocr_top_tokens: string[];
    logo_ok: boolean;
    logo_brands: Array<{name: string, score: number}>;
    errors: string[];
  };
  openai: {
    ok: boolean;
    brand_guess: string;
    confidence: number;
    raw_words: string[];
    errors: string[];
  };
  resolver: {
    off_ok: boolean;
    off_hits: number;
    usda_hits: number;
    picked: string;
    errors: string[];
  };
  decision: string;
  elapsed_ms: number;
  errors?: string[];
}

export default function DebugImageProbe() {
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [analyzerResult, setAnalyzerResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      // Scale image
      const maxSize = 1280;
      let { width, height } = img;
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const imageBase64 = dataUrl.split(',')[1];
      
      setCurrentImage(imageBase64);
      await runProbe(imageBase64);
    };

    img.src = URL.createObjectURL(file);
  };

  const runProbe = async (imageBase64: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('image-analyzer-probe', {
        body: { imageBase64, dry_run: true }
      });

      if (error) throw error;
      setProbeResult(data);
    } catch (error) {
      console.error('Probe error:', error);
      setProbeResult({
        ok: false,
        errors: [error.message],
        echo: { w: 0, h: 0, sha256: '', bytes: 0 },
        google: { ocr_ok: false, ocr_chars: 0, ocr_top_tokens: [], logo_ok: false, logo_brands: [], errors: [] },
        openai: { ok: false, brand_guess: '', confidence: 0, raw_words: [], errors: [] },
        resolver: { off_ok: false, off_hits: 0, usda_hits: 0, picked: '', errors: [] },
        decision: 'error',
        elapsed_ms: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const testProductionAnalyzer = async () => {
    if (!currentImage) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: { imageBase64: currentImage, mode: 'scan' }
      });

      if (error) throw error;
      setAnalyzerResult(data);
    } catch (error) {
      console.error('Analyzer error:', error);
      setAnalyzerResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Image Analysis Probe</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Test Image</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="file" accept="image/*" onChange={handleFileSelect} />
          {loading && <p className="mt-2 text-muted-foreground">Processing...</p>}
        </CardContent>
      </Card>

      {probeResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Probe Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Probe Results 
                <Badge variant={probeResult.ok ? "default" : "destructive"}>
                  {probeResult.ok ? "OK" : "ERROR"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Echo */}
              <div>
                <h4 className="font-semibold">Image Echo</h4>
                <p className="text-sm text-muted-foreground">
                  {probeResult.echo.w}×{probeResult.echo.h}, {Math.round(probeResult.echo.bytes / 1024)}KB
                  <br />SHA: {probeResult.echo.sha256}
                </p>
              </div>

              {/* Google Vision */}
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  Google Vision
                  <Badge variant={probeResult.google.ocr_ok ? "default" : "secondary"}>
                    OCR: {probeResult.google.ocr_ok ? "OK" : "FAIL"}
                  </Badge>
                  <Badge variant={probeResult.google.logo_ok ? "default" : "secondary"}>
                    Logo: {probeResult.google.logo_ok ? "OK" : "FAIL"}
                  </Badge>
                </h4>
                {probeResult.google.ocr_ok && (
                  <div className="text-sm">
                    <p>OCR: {probeResult.google.ocr_chars} chars</p>
                    <p>Top tokens: {probeResult.google.ocr_top_tokens.slice(0, 10).join(', ')}</p>
                  </div>
                )}
                {probeResult.google.logo_ok && (
                  <div className="text-sm">
                    <p>Logos: {probeResult.google.logo_brands.map(b => `${b.name} (${b.score})`).join(', ')}</p>
                  </div>
                )}
                {probeResult.google.errors.length > 0 && (
                  <div className="text-sm text-red-600">
                    Errors: {probeResult.google.errors.join(', ')}
                  </div>
                )}
              </div>

              {/* OpenAI */}
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  OpenAI Vision
                  <Badge variant={probeResult.openai.ok ? "default" : "secondary"}>
                    {probeResult.openai.ok ? "OK" : "FAIL"}
                  </Badge>
                </h4>
                {probeResult.openai.ok && (
                  <div className="text-sm">
                    <p>Brand: {probeResult.openai.brand_guess}</p>
                    <p>Confidence: {probeResult.openai.confidence}</p>
                    <p>Words: {probeResult.openai.raw_words.join(', ')}</p>
                  </div>
                )}
                {probeResult.openai.errors.length > 0 && (
                  <div className="text-sm text-red-600">
                    Errors: {probeResult.openai.errors.join(', ')}
                  </div>
                )}
              </div>

              {/* Resolver */}
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  Product Resolver
                  <Badge variant={probeResult.resolver.off_ok ? "default" : "secondary"}>
                    OFF: {probeResult.resolver.off_ok ? "OK" : "FAIL"}
                  </Badge>
                </h4>
                {probeResult.resolver.off_ok && (
                  <div className="text-sm">
                    <p>OFF hits: {probeResult.resolver.off_hits}</p>
                    <p>USDA hits: {probeResult.resolver.usda_hits}</p>
                    <p>Picked: {probeResult.resolver.picked}</p>
                  </div>
                )}
              </div>

              {/* Decision */}
              <div>
                <h4 className="font-semibold">Final Decision</h4>
                <Badge variant={probeResult.decision === 'none' ? "destructive" : "default"}>
                  {probeResult.decision.toUpperCase()}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Elapsed: {probeResult.elapsed_ms}ms
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Production Analyzer */}
          <Card>
            <CardHeader>
              <CardTitle>Production Analyzer Test</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={testProductionAnalyzer} disabled={!currentImage || loading}>
                Send to Production Analyzer
              </Button>
              
              {analyzerResult && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Analyzer Response</h4>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-96">
                    {JSON.stringify(analyzerResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {probeResult?.errors && probeResult.errors.length > 0 && (
        <Card className="mt-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Global Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-red-600">
              {probeResult.errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
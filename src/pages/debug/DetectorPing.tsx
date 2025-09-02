import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface PingResult {
  options?: {
    status: number;
    headers: Record<string, string>;
    ok: boolean;
  };
  post?: {
    status: number;
    data: any;
    ok: boolean;
    error?: string;
  };
}

export default function DetectorPing() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PingResult | null>(null);

  const testDetector = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const baseUrl = 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/meal-detector-v1';
      
      // Test OPTIONS (CORS preflight)
      const optionsResponse = await fetch(baseUrl, {
        method: 'OPTIONS',
      });

      const optionsHeaders: Record<string, string> = {};
      optionsResponse.headers.forEach((value, key) => {
        optionsHeaders[key] = value;
      });

      // Test POST with tiny transparent image
      const tinyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      let postResult: any = {};
      try {
        const postResponse = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_base64: `data:image/png;base64,${tinyBase64}`,
            debug: true
          })
        });

        const postData = await postResponse.json();
        postResult = {
          status: postResponse.status,
          data: postData,
          ok: postResponse.ok,
        };
      } catch (error) {
        postResult = {
          status: 0,
          data: null,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      setResult({
        options: {
          status: optionsResponse.status,
          headers: optionsHeaders,
          ok: optionsResponse.ok,
        },
        post: postResult,
      });

    } catch (error) {
      console.error('Detector ping failed:', error);
      setResult({
        options: {
          status: 0,
          headers: {},
          ok: false,
        },
        post: {
          status: 0,
          data: null,
          ok: false,
          error: error instanceof Error ? error.message : 'Network error'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (ok: boolean, status: number) => {
    if (ok && status === 200) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Detector Health Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testDetector} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Detector'
            )}
          </Button>

          {result && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    OPTIONS Request (CORS)
                    {getStatusBadge(result.options?.ok || false, result.options?.status || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Status:</strong> {result.options?.status}</div>
                    <div><strong>Access-Control-Allow-Origin:</strong> {result.options?.headers['access-control-allow-origin'] || 'Missing'}</div>
                    <div><strong>Access-Control-Allow-Methods:</strong> {result.options?.headers['access-control-allow-methods'] || 'Missing'}</div>
                    <div><strong>Access-Control-Allow-Headers:</strong> {result.options?.headers['access-control-allow-headers'] || 'Missing'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    POST Request (Detection)
                    {getStatusBadge(result.post?.ok || false, result.post?.status || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Status:</strong> {result.post?.status}</div>
                    {result.post?.error && (
                      <div className="text-red-600"><strong>Error:</strong> {result.post.error}</div>
                    )}
                    {result.post?.data && (
                      <div>
                        <strong>Response:</strong>
                        <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-auto">
                          {JSON.stringify(result.post.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                {result.options?.ok && result.post?.ok ? (
                  <div className="text-green-600 font-medium">✓ Detector is healthy and reachable</div>
                ) : (
                  <div className="text-red-600 font-medium">✗ Detector has issues</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
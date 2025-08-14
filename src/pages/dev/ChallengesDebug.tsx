import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function ChallengesDebug() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [billboardData, setBillboardData] = useState<any[]>([]);
  const [activeData, setActiveData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user info
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        console.log('[WHOAMI]', user?.user?.id, user?.user?.email);
        setUserInfo(user?.user);

        if (!user?.user?.id) {
          setError('No authenticated user found');
          setIsLoading(false);
          return;
        }

        // Fetch billboard challenges
        const { data: billboardResult, error: billboardError } = await supabase.rpc('my_billboard_challenges');
        if (billboardError) {
          console.error('[BILLBOARD_DATA] error:', billboardError);
        } else {
          console.log('[BILLBOARD_DATA]', billboardResult);
          setBillboardData(billboardResult || []);
        }

        // Fetch active private challenges  
        const { data: activeResult, error: activeError } = await supabase.rpc('my_active_private_challenges');
        if (activeError) {
          console.error('[ACTIVE_DATA] error:', activeError);
        } else {
          console.log('[ACTIVE_DATA]', activeResult);
          setActiveData(activeResult || []);
        }

      } catch (err: any) {
        console.error('[AUTH_GUARD] Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p>This debug page is only available in development mode.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Challenges Debug Page</h1>
        <Button variant="outline" onClick={() => navigate('/')}>
          ← Back to Home
        </Button>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current User Session</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse">Loading user info...</div>
          ) : error ? (
            <div className="text-red-600">Error: {error}</div>
          ) : userInfo ? (
            <div className="space-y-2">
              <div><strong>UID:</strong> <code className="bg-muted px-2 py-1 rounded">{userInfo.id}</code></div>
              <div><strong>Email:</strong> <code className="bg-muted px-2 py-1 rounded">{userInfo.email}</code></div>
              <div><strong>Created:</strong> {new Date(userInfo.created_at).toLocaleString()}</div>
            </div>
          ) : (
            <div className="text-yellow-600">No user found - not authenticated</div>
          )}
        </CardContent>
      </Card>

      {/* Billboard Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Billboard Challenges
            <Badge variant="secondary">{billboardData.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billboardData.length === 0 ? (
            <div className="text-muted-foreground italic">No billboard challenges found</div>
          ) : (
            <div className="space-y-3">
              {billboardData.map((challenge, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="font-semibold">{challenge.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Type: <Badge variant="outline">{challenge.challenge_type || 'custom'}</Badge>
                    {challenge.challenge_type === 'rank_of_20' && (
                      <span className="text-red-600 ml-2">⚠️ RANK_OF_20 LEAKED!</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">ID: {challenge.id}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            My Active Private Challenges
            <Badge variant="secondary">{activeData.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeData.length === 0 ? (
            <div className="text-muted-foreground italic">No active challenges found</div>
          ) : (
            <div className="space-y-3">
              {activeData.map((challenge, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="font-semibold">{challenge.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Type: <Badge variant="outline">{challenge.challenge_type || 'custom'}</Badge>
                    {challenge.challenge_type === 'rank_of_20' && (
                      <span className="text-red-600 ml-2">⚠️ RANK_OF_20 LEAKED!</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">ID: {challenge.id}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation to Arena */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Test navigation to verify Rank-of-20 appears in Arena but not in Billboard/Active lists.
            </p>
            <Button 
              onClick={() => navigate('/game-and-challenge')}
              className="w-full"
            >
              Go to Arena (Game & Challenge) →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Raw JSON Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw JSON Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Billboard RPC Result:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(billboardData, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Active RPC Result:</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(activeData, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
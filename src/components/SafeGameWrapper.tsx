import React, { Component, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class SafeGameWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Gaming page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI that matches the existing design
      return (
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Header - identical to original */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Gaming & Challenges</h1>
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join challenges, compete with friends, and unlock achievements on your wellness journey
            </p>
          </div>

          {/* Error state with same layout as stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">0</div>
                <div className="text-sm text-muted-foreground">Public Challenges</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">0</div>
                <div className="text-sm text-muted-foreground">Your Challenges</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-muted-foreground">Trending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-muted-foreground">Micro Challenges</div>
              </CardContent>
            </Card>
          </div>

          {/* Safe fallback message */}
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Loading Challenges...</h3>
              <p className="text-muted-foreground">
                Please wait while we load your gaming content.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafeGameWrapper;
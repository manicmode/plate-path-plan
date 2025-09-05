import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function DebugIndex() {
  const navigate = useNavigate();

  const debugPages = [
    {
      title: 'iOS Audio Debug',
      description: 'Test iOS Safari audio fixes with WebAudio routing',
      path: '/debug/ios-audio',
      icon: '🔊'
    },
    {
      title: 'Camera Photo Debug',
      description: 'Test camera photo capture without getUserMedia',
      path: '/debug/cam-photo',
      icon: '📸'
    }
  ];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🛠️ Debug Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Collection of debug tools for testing various app features.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {debugPages.map((page) => (
          <Card key={page.path} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{page.icon}</span>
                {page.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {page.description}
              </p>
              <Button 
                onClick={() => navigate(page.path)}
                className="w-full"
              >
                Open Debug Tool
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
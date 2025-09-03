import React from 'react';
import { PhotoPipelineDebugger } from '@/components/debug/PhotoPipelineDebugger';
import { ClientDebugEnv } from '@/components/debug/ClientDebugEnv';

export const DebugPipeline: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Photo Pipeline Debug Suite</h1>
          <p className="text-muted-foreground">
            Comprehensive debugging tools to eliminate spinner issues and verify end-to-end functionality
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ClientDebugEnv />
          </div>
          
          <div className="lg:col-span-2">
            <PhotoPipelineDebugger />
          </div>
        </div>
        
        <div className="mt-8 p-6 bg-slate-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Quick Setup Checklist</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>✅ DEBUG_EDGE=true set in Supabase (server-side)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>🔄 Toggle VITE_DEBUG_CLIENT=true above (client-side)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>🧪 Run smoke tests to verify all functionality</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>📊 Check browser console for timing breadcrumbs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPipeline;
import React from 'react';
import { Atom, Radar, Search } from 'lucide-react';

interface HealthAnalysisLoadingProps {
  message: string;
  analysisType: 'barcode' | 'image' | 'manual';
}

export const HealthAnalysisLoading: React.FC<HealthAnalysisLoadingProps> = ({
  message,
  analysisType
}) => {
  const getIcon = () => {
    switch (analysisType) {
      case 'barcode':
        return <Search className="w-16 h-16 text-blue-400 animate-pulse" />;
      case 'image':
        return <Radar className="w-16 h-16 text-green-400" />;
      case 'manual':
        return <Atom className="w-16 h-16 text-purple-400" />;
      default:
        return <Atom className="w-16 h-16 text-green-400" />;
    }
  };

  const getAnimation = () => {
    switch (analysisType) {
      case 'barcode':
        return 'animate-pulse';
      case 'image':
        return 'animate-spin';
      case 'manual':
        return 'animate-bounce';
      default:
        return 'animate-spin';
    }
  };

  const getGradient = () => {
    switch (analysisType) {
      case 'barcode':
        return 'from-blue-600/20 via-blue-500/10 to-cyan-600/20';
      case 'image':
        return 'from-green-600/20 via-emerald-500/10 to-teal-600/20';
      case 'manual':
        return 'from-purple-600/20 via-violet-500/10 to-pink-600/20';
      default:
        return 'from-green-600/20 via-emerald-500/10 to-teal-600/20';
    }
  };

  return (
    <div className={`w-full h-full bg-gradient-to-br ${getGradient()} flex flex-col items-center justify-center relative overflow-hidden`}>
      {/* Background Animation */}
      <div className="absolute inset-0">
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
        
        {/* Circuit lines */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Radar sweep for image analysis */}
        {analysisType === 'image' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-96 h-96 border border-green-400/30 rounded-full">
              <div className="absolute inset-0 border border-green-400/20 rounded-full animate-ping"></div>
              <div className="absolute inset-4 border border-green-400/40 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute inset-8 border border-green-400/60 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              
              {/* Radar sweep line */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent origin-left animate-spin"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {/* Main Icon */}
        <div className="mb-8 flex justify-center">
          <div className={`relative ${getAnimation()}`}>
            {getIcon()}
            {/* Glow effect */}
            <div className="absolute inset-0 blur-xl opacity-60">
              {getIcon()}
            </div>
          </div>
        </div>

        {/* DNA Strand Animation for Analysis */}
        {analysisType !== 'image' && (
          <div className="mb-8 flex justify-center">
            <div className="relative w-32 h-16">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
              </div>
              {/* DNA spiral */}
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-white/60 rounded-full animate-bounce"
                    style={{
                      left: `${12.5 * i}%`,
                      top: '25%',
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                ))}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-white/40 rounded-full animate-bounce"
                    style={{
                      left: `${12.5 * i}%`,
                      top: '75%',
                      animationDelay: `${i * 0.1 + 0.4}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading Text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">
            🔬 Health Analysis in Progress
          </h2>
          
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-lg text-white font-medium animate-pulse">
              {message}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-2 text-sm text-white/80">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Decoding ingredients...</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <span>Scanning nutrition matrix...</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <span>Generating health profile...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// Minimal error boundary
class MinimalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="text-center space-y-4 bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Minimal App component
function MinimalApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto">
          <img 
            src="/lovable-uploads/06077524-4274-4512-a53f-779d8e98607f.png" 
            alt="VOYAGE Logo" 
            className="w-16 h-16 object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VOYAGE</h1>
          <p className="text-gray-600 mt-2">AI Wellness Assistant</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
          <p className="text-gray-700 mb-4">App is loading successfully!</p>
          <button 
            onClick={() => console.log('Button clicked!')}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(rootElement);

console.log('🚀 Starting minimal app render...');

try {
  root.render(
    <MinimalErrorBoundary>
      <StrictMode>
        <MinimalApp />
      </StrictMode>
    </MinimalErrorBoundary>
  );
  console.log('✅ Minimal app rendered successfully');
} catch (error) {
  console.error('🚨 Error rendering minimal app:', error);
}
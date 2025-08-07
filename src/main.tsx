import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

console.log('🚀 Step 1: Starting app initialization...');

// Step 2: Import CSS
try {
  require("./index.css");
  console.log('✅ Step 2: CSS imported successfully');
} catch (error) {
  console.error('🚨 Step 2 FAILED: CSS import failed:', error);
}

// Step 3: Import App component
let App: React.ComponentType = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)'
  }}>
    <div style={{ 
      textAlign: 'center', 
      padding: '2rem', 
      background: 'white', 
      borderRadius: '1rem', 
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>VOYAGE</h1>
      <p style={{ color: '#6b7280' }}>Fallback App Component</p>
    </div>
  </div>
);

try {
  const AppModule = require("./App.tsx");
  App = AppModule.default || AppModule;
  console.log('✅ Step 3: App imported successfully');
} catch (error) {
  console.error('🚨 Step 3 FAILED: App import failed:', error);
}

// Step 4: Import ErrorBoundary
class FallbackErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error caught by fallback boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f3f4f6'
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
            <button 
              onClick={() => window.location.reload()}
              style={{ 
                padding: '0.5rem 1rem', 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.5rem', 
                cursor: 'pointer' 
              }}
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

let ErrorBoundary: React.ComponentType<{ children: React.ReactNode; fallback?: React.ReactNode }> = FallbackErrorBoundary;

try {
  const ErrorBoundaryModule = require("./components/ErrorBoundary");
  ErrorBoundary = ErrorBoundaryModule.default || ErrorBoundaryModule;
  console.log('✅ Step 4: ErrorBoundary imported successfully');
} catch (error) {
  console.error('🚨 Step 4 FAILED: ErrorBoundary import failed:', error);
}

// Step 5: Import AuthProvider
let AuthProvider: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => {
  console.log('Using fallback AuthProvider');
  return <>{children}</>;
};

try {
  const AuthModule = require("./contexts/auth");
  AuthProvider = AuthModule.AuthProvider;
  console.log('✅ Step 5: AuthProvider imported successfully');
} catch (error) {
  console.error('🚨 Step 5 FAILED: AuthProvider import failed:', error);
}

// Step 6: Import NutritionProvider
let NutritionProvider: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => {
  console.log('Using fallback NutritionProvider');
  return <>{children}</>;
};

try {
  const NutritionModule = require("./contexts/NutritionContext");
  NutritionProvider = NutritionModule.NutritionProvider;
  console.log('✅ Step 6: NutritionProvider imported successfully');
} catch (error) {
  console.error('🚨 Step 6 FAILED: NutritionProvider import failed:', error);
}

// Step 7: Import NotificationProvider
let NotificationProvider: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => {
  console.log('Using fallback NotificationProvider');
  return <>{children}</>;
};

try {
  const NotificationModule = require("./contexts/NotificationContext");
  NotificationProvider = NotificationModule.NotificationProvider;
  console.log('✅ Step 7: NotificationProvider imported successfully');
} catch (error) {
  console.error('🚨 Step 7 FAILED: NotificationProvider import failed:', error);
}

// Step 8: Import React Query
class FallbackQueryClient {
  defaultOptions = {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  };
}

let QueryClient: new() => any = FallbackQueryClient;
let QueryClientProvider: React.ComponentType<{ client: any; children: React.ReactNode }> = ({ children }) => {
  console.log('Using fallback QueryClientProvider');
  return <>{children}</>;
};

try {
  const QueryModule = require('@tanstack/react-query');
  QueryClient = QueryModule.QueryClient;
  QueryClientProvider = QueryModule.QueryClientProvider;
  console.log('✅ Step 8: React Query imported successfully');
} catch (error) {
  console.error('🚨 Step 8 FAILED: React Query import failed:', error);
}

// Step 9: Import and apply security headers
try {
  const SecurityModule = require("./lib/securityHeaders");
  SecurityModule.applySecurityHeaders();
  console.log('✅ Step 9: Security headers applied successfully');
} catch (error) {
  console.error('🚨 Step 9 FAILED: Security headers failed:', error);
}

// Step 10: Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log('✅ Step 10: Mobile detection completed', { isMobile });

// Step 11: Create root
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}
const root = createRoot(rootElement);

// Step 12: Create QueryClient
let queryClient: any;
try {
  queryClient = new QueryClient();
  console.log('✅ Step 11: QueryClient created successfully');
} catch (error) {
  console.error('🚨 Step 11 FAILED: QueryClient creation failed:', error);
  queryClient = new FallbackQueryClient();
}

console.log('🚀 Step 12: Starting app render...');

// Step 13: Render app
try {
  root.render(
    <ErrorBoundary>
      <AuthProvider>
        <ErrorBoundary fallback={
          <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem',
            background: '#f3f4f6'
          }}>
            <div style={{ 
              textAlign: 'center',
              background: 'white',
              padding: '2rem',
              borderRadius: '1rem',
              boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Loading Error</h2>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Please refresh the page to continue.</p>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        }>
          <QueryClientProvider client={queryClient}>
            <NutritionProvider>
              <NotificationProvider>
                {isMobile ? (
                  <App />
                ) : (
                  <StrictMode>
                    <App />
                  </StrictMode>
                )}
              </NotificationProvider>
            </NutritionProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
  console.log('✅ Step 12: App rendered successfully!');
} catch (error) {
  console.error('🚨 Step 12 FAILED: App render failed:', error);
  
  // Emergency fallback render
  root.render(
    <div style={{ 
      minHeight: '100vh', 
      background: '#f3f4f6', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem' 
    }}>
      <div style={{ 
        textAlign: 'center', 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '1rem', 
        boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
        maxWidth: '28rem'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Critical Error</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>The app failed to start. Check console for details.</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            marginRight: '0.5rem'
          }}
        >
          Refresh
        </button>
        <button 
          onClick={() => {
            try {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            } catch (e) {
              window.location.reload();
            }
          }}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          Clear & Refresh
        </button>
      </div>
    </div>
  );
}
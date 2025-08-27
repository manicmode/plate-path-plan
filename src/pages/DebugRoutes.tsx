import { useNavigate } from 'react-router-dom';
import DebugImageProbe from './DebugImageProbe';

export default function DebugRoutes() {
  const navigate = useNavigate();
  
  // Simple routing for debug page
  const currentPath = window.location.pathname;
  
  if (currentPath === '/debug/image-probe') {
    return <DebugImageProbe />;
  }
  
  // If on /debug, show menu
  if (currentPath === '/debug') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Debug Tools</h1>
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/debug/image-probe')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Image Analysis Probe</h3>
            <p className="text-muted-foreground">Test image analyzer pipeline step-by-step</p>
          </button>
        </div>
      </div>
    );
  }
  
  return null;
}
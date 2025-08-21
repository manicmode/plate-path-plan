import { Navigate } from 'react-router-dom';

// This file handles the deep link routing for /influencers/[handle]
// The actual logic is handled in the main Influencers page component
export default function InfluencerHandlePage() {
  // This will be handled by the router, but we include this as a fallback
  return <Navigate to="/influencers" replace />;
}
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes/constants";

export const InfluencerHubCTA = () => {
  const navigate = useNavigate();

  const handleOpenHub = () => {
    // Fire analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'influencer_hub.nav_open_from_home');
    }
    
    navigate(ROUTES.INFLUENCER_HUB);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-400 to-cyan-600 p-1 shadow-xl">
        <div className="bg-white dark:bg-gray-900 rounded-[22px] p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-cyan-600" />
                <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">Creator Tools</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Influencer Hub</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Track earnings, grow your community, and monetize your content
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Analytics
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Monetization
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleOpenHub}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="sm"
            >
              <Star className="h-4 w-4 mr-2" />
              Open Hub
            </Button>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-600/10 to-cyan-400/10 rounded-full translate-y-8 -translate-x-8" />
        </div>
      </div>
    </motion.div>
  );
};
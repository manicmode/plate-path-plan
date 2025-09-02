import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { analyzeForHealthScan } from '@/healthScan/orchestrator';
import { FF } from '@/featureFlags';
import { HealthPhotoIntakeModal } from '@/components/photo/HealthPhotoIntakeModal';

export default function HealthScanPhoto() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    navigate('/scan');
  };

  if (!FF.FEATURE_HEALTH_SCAN_PHOTO) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Feature Not Available</h1>
          <p className="text-muted-foreground mb-6">
            Health Scan photo capture is not currently available.
          </p>
          <Button onClick={handleClose}>Go Back</Button>
        </div>
      </div>
    );
  }

  return <HealthPhotoIntakeModal isOpen={isOpen} onClose={handleClose} />;
}
import { useState } from 'react';

interface TrackerInfo {
  type: string;
  name: string;
  color: string;
}

export const useTrackerInsights = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState<TrackerInfo | null>(null);

  const openInsights = (trackerInfo: TrackerInfo) => {
    setSelectedTracker(trackerInfo);
    setIsOpen(true);
  };

  const closeInsights = () => {
    setIsOpen(false);
    setSelectedTracker(null);
  };

  return {
    isOpen,
    selectedTracker,
    openInsights,
    closeInsights,
  };
};
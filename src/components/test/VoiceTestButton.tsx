import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import { useState } from 'react';
import { VoiceSearchModal } from '@/components/scan/VoiceSearchModal';
import { useNavigate } from 'react-router-dom';

export const VoiceTestButton = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleProductSelected = (product: any) => {
    console.log('Test: Voice product selected:', product);
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-emerald-500 hover:bg-emerald-600 shadow-lg"
        size="lg"
      >
        <Mic className="h-5 w-5 mr-2" />
        Test Voice
      </Button>
      
      <VoiceSearchModal
        open={open}
        onOpenChange={setOpen}
        onProductSelected={handleProductSelected}
      />
    </>
  );
};
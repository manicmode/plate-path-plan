import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "@/contexts/auth";

interface QrPosterProps {
  shareUrl: string;
  onClose: () => void;
  onDownload?: () => void;
}

export const QrPoster = ({ shareUrl, onClose, onDownload }: QrPosterProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generatePoster();
  }, [shareUrl, user]);

  const generatePoster = async () => {
    if (!canvasRef.current) return;

    setIsGenerating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions (Instagram story format)
    canvas.width = 1080;
    canvas.height = 1920;

    try {
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Load QR code image
      const qrImage = new Image();
      await new Promise((resolve) => {
        qrImage.onload = resolve;
        qrImage.src = qrDataUrl;
      });

      // QR code background (white circle)
      const qrSize = 400;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = canvas.height / 2 - qrSize / 2;
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, qrSize / 2 + 40, 0, Math.PI * 2);
      ctx.fill();

      // Draw QR code
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // Title text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 80px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Join My Challenge!', canvas.width / 2, 300);

      // User name/handle
      const displayName = user?.name || user?.email?.split('@')[0] || 'Fitness Coach';
      ctx.font = '60px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`by @${displayName}`, canvas.width / 2, 400);

      // CTA text
      ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText('Scan to Get Started', canvas.width / 2, qrY + qrSize + 120);

      // Bottom text
      ctx.font = '40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('Transform Your Body & Mind', canvas.width / 2, canvas.height - 200);
      ctx.fillText('Daily Coaching • Community Support • Real Results', canvas.width / 2, canvas.height - 140);

    } catch (error) {
      console.error('Error generating poster:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPoster = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `fitness-challenge-qr-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
    
    onDownload?.();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            QR Poster
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-[9/16] bg-muted/20 rounded-lg overflow-hidden relative"
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
              style={{ display: isGenerating ? 'none' : 'block' }}
            />
            
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
          </motion.div>

          <div className="flex gap-2">
            <Button
              onClick={downloadPoster}
              disabled={isGenerating}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Perfect for Instagram stories, print, or sharing anywhere!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
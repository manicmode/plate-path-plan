import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateCouponModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCouponModal({ open, onOpenChange }: CreateCouponModalProps) {
  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const percent = parseInt(percentOff);
    if (!code.trim() || !percent || percent < 1 || percent > 100) {
      toast({
        title: "Error",
        description: "Please enter a valid code and percentage (1-100)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-coupon', {
        body: { code: code.trim().toUpperCase(), percent_off: percent }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: `Coupon ${data.coupon.code} created successfully!`,
        });
        setCode('');
        setPercentOff('');
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Failed to create coupon');
      }
    } catch (error) {
      console.error('Create coupon error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Create Coupon
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Coupon Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE10"
              required
            />
          </div>
          <div>
            <Label htmlFor="percent">Percentage Off</Label>
            <Input
              id="percent"
              type="number"
              min="1"
              max="100"
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value)}
              placeholder="10"
              required
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
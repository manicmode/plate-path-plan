import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Pill } from 'lucide-react';
import { useMySupplements } from '@/hooks/useMySupplements';
import { getAllProducts, type SupplementProduct } from '@/lib/supplements/registry';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddSupplementModal = ({ isOpen, onClose }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDosage, setCustomDosage] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const { addSupplement } = useMySupplements();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setShowCustomForm(false);
      setCustomName('');
      setCustomDosage('');
      setCustomUnit('');
    }
  }, [isOpen]);

  // Debounced search results
  const searchResults = useMemo(() => {
    const products = getAllProducts();
    if (!searchQuery.trim()) return products.slice(0, 10);
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.short?.toLowerCase().includes(query) ||
      product.tags?.some(tag => tag.toLowerCase().includes(query))
    ).slice(0, 10);
  }, [searchQuery]);

  const handleAddFromRegistry = (product: SupplementProduct) => {
    addSupplement({
      slug: product.slug,
      name: product.name,
      source: 'manual',
    });

    toast({
      title: "Added to My Supplements!",
      description: `${product.name} has been added to your supplement list.`,
    });

    onClose();
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a supplement name.",
        variant: "destructive",
      });
      return;
    }

    addSupplement({
      name: customName.trim(),
      dosage: customDosage.trim() || undefined,
      unit: customUnit.trim() || undefined,
      source: 'manual',
    });

    toast({
      title: "Added to My Supplements!",
      description: `${customName} has been added to your supplement list.`,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`glass-card border-0 rounded-3xl ${isMobile ? 'w-[95vw] max-w-md' : 'max-w-2xl'} max-h-[80vh]`}>
        <DialogHeader className={isMobile ? 'pb-2' : 'pb-4'}>
          <DialogTitle className={`text-center ${isMobile ? 'text-lg' : 'text-xl'}`}>
            Add Supplement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Section */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search supplements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 glass-button border-0 ${isMobile ? 'h-10' : 'h-12'}`}
              />
            </div>

            {/* Search Results */}
            <ScrollArea className={`${isMobile ? 'h-64' : 'h-80'} rounded-2xl border bg-muted/20`}>
              <div className="p-3 space-y-2">
                {searchResults.map((product) => (
                  <div
                    key={product.slug}
                    className="flex items-center justify-between p-3 rounded-xl bg-background/60 hover:bg-background/80 transition-colors cursor-pointer group"
                    onClick={() => handleAddFromRegistry(product)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Pill className="h-4 w-4 text-primary" />
                        <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>
                          {product.name}
                        </h4>
                      </div>
                      {product.short && (
                        <p className={`text-muted-foreground line-clamp-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {product.short}
                        </p>
                      )}
                      {product.tags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.tags.slice(0, 3).map((tag) => (
                            <Badge 
                              key={tag} 
                              variant="outline" 
                              className={`${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs'}`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFromRegistry(product);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                ))}
                
                {searchResults.length === 0 && searchQuery && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className={isMobile ? 'text-sm' : 'text-base'}>
                      No supplements found for "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Custom Supplement Section */}
          <div className="space-y-3">
            {!showCustomForm ? (
              <Button
                onClick={() => setShowCustomForm(true)}
                variant="outline"
                className={`w-full glass-button rounded-2xl ${isMobile ? 'h-10' : 'h-12'}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add a custom supplement
              </Button>
            ) : (
              <div className="space-y-3">
                <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Custom Supplement
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="customName" className={isMobile ? 'text-sm' : 'text-base'}>
                    Name *
                  </Label>
                  <Input
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., Ashwagandha, Custom Blend"
                    className={`glass-button border-0 ${isMobile ? 'h-9' : 'h-10'}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="customDosage" className={isMobile ? 'text-sm' : 'text-base'}>
                      Dosage
                    </Label>
                    <Input
                      id="customDosage"
                      value={customDosage}
                      onChange={(e) => setCustomDosage(e.target.value)}
                      placeholder="e.g., 500"
                      className={`glass-button border-0 ${isMobile ? 'h-9' : 'h-10'}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customUnit" className={isMobile ? 'text-sm' : 'text-base'}>
                      Unit
                    </Label>
                    <Input
                      id="customUnit"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="e.g., mg, tablets"
                      className={`glass-button border-0 ${isMobile ? 'h-9' : 'h-10'}`}
                    />
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    onClick={() => setShowCustomForm(false)}
                    variant="outline"
                    className={`flex-1 ${isMobile ? 'h-9' : 'h-10'}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCustom}
                    className={`flex-1 gradient-primary ${isMobile ? 'h-9' : 'h-10'}`}
                  >
                    Add Custom
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
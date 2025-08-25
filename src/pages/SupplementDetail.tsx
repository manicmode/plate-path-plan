import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, Info, Star } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { loadRegistry, type Registry } from '@/lib/supplements/registry';
import { type SupplementCatalogItem } from '@/types/supplements';

const SupplementDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [product, setProduct] = useState<SupplementCatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const from = (location.state as { from?: 'hub' | 'tracker' } | null)?.from;

  const handleBack = () => {
    if (from === 'hub') return navigate('/supplement-hub', { replace: true });
    if (from === 'tracker') return navigate('/supplements', { replace: true });
    navigate(-1);
  };

  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!slug) return;
        
        const registry: Registry = await loadRegistry();
        const foundProduct = registry.catalog[slug];
        
        if (foundProduct) {
          setProduct(foundProduct);
        }
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="text-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading supplement details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Supplements
        </Button>
        
        <Card className="glass-card border-0 rounded-3xl">
          <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
            <div className="text-center py-16">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Product Not Found
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                The supplement you're looking for doesn't exist in our catalog.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Back Navigation */}
      <Button
        onClick={handleBack}
        variant="ghost"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Supplements
      </Button>

      {/* Product Header */}
      <div className="text-center space-y-2 sm:space-y-4">
        <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} gradient-primary rounded-3xl flex items-center justify-center mx-auto neon-glow`}>
          <ShoppingCart className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-white`} />
        </div>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold neon-text mb-2`}>
            {product.name}
          </h1>
          {product.shortDesc && (
            <p className={`text-gray-600 dark:text-gray-300 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>
              {product.shortDesc}
            </p>
          )}
        </div>
      </div>

      {/* Product Details */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className={`text-gray-900 dark:text-white ${isMobile ? 'text-lg' : 'text-xl'}`}>
            Product Information
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${isMobile ? 'p-4' : 'p-6'} pt-0`}>
          
          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="capitalize">
                    {tag.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          {product.defaultPrice && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Price</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ${product.defaultPrice.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Placeholder for product details */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Product Details
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Detailed product information, ingredients, dosage instructions, and scientific backing would be displayed here in a full implementation.
                </p>
              </div>
            </div>
          </div>

          {/* Mock Reviews */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                4.8 (1,234 reviews)
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              "High quality supplement with great results" - Top review
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Section */}
      <Card className="glass-card border-0 rounded-3xl">
        <CardContent className={`${isMobile ? 'p-6' : 'p-8'}`}>
          <div className="text-center space-y-4">
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
              Ready to Purchase?
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              This is a demo product page. In a full implementation, you would integrate with your e-commerce platform.
            </p>
            <Button 
              className={`gradient-primary rounded-2xl ${isMobile ? 'h-12' : 'h-14'} neon-glow font-semibold px-8`}
              onClick={() => {
                // Mock purchase action
                alert(`Demo: Would purchase ${product.name} for $${product.defaultPrice?.toFixed(2) || 'N/A'}`);
              }}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart - ${product.defaultPrice?.toFixed(2) || 'N/A'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplementDetail;
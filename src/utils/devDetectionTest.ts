/**
 * Development Detection Test Utility
 * Simple script to test GPT detection on sample images
 */

interface TestResult {
  image: string;
  items: Array<{ name: string; grams: number; confidence: number }>;
  processTime: number;
  error?: string;
}

// Sample base64 images (small test images for development)
const SAMPLE_IMAGES = {
  salmon_plate: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', // Placeholder
  pasta_salad: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', // Placeholder
  omelet_toast: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=' // Placeholder
};

async function testGptDetection(imageName: string, imageBase64: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Import detection function dynamically
    const { detectWithGpt } = await import('@/lib/detect/router');
    
    console.log(`[DEV_TEST] Testing ${imageName}...`);
    const items = await detectWithGpt(imageBase64);
    
    const processTime = Date.now() - startTime;
    
    return {
      image: imageName,
      items: items.map(item => ({
        name: item.name,
        grams: item.grams,
        confidence: item.confidence
      })),
      processTime,
    };
  } catch (error) {
    const processTime = Date.now() - startTime;
    return {
      image: imageName,
      items: [],
      processTime,
      error: String(error)
    };
  }
}

export async function runDetectionTests(): Promise<TestResult[]> {
  console.log('[DEV_TEST] Starting GPT detection tests...');
  
  const results: TestResult[] = [];
  
  for (const [name, base64] of Object.entries(SAMPLE_IMAGES)) {
    const result = await testGptDetection(name, base64);
    results.push(result);
    console.log(`[DEV_TEST] ${name}:`, result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('[DEV_TEST] All tests completed:', results);
  return results;
}

// Make available in dev console
if (import.meta.env.DEV) {
  (window as any).testGptDetection = runDetectionTests;
  console.log('[DEV] GPT detection test available: window.testGptDetection()');
}
/**
 * Emergency function to clear any cached or localStorage mock data
 */
export function clearAllMockData() {
  try {
    // Clear localStorage keys that might contain mock data
    const keysToCheck = [
      'nutrition_logs',
      'saved_reports', 
      'mock_data',
      'demo_data',
      'test_data',
      'scan_recents_v1'
    ];
    
    keysToCheck.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log('[CLEAR-MOCK] Removing localStorage key:', key);
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('nutrition') || key.includes('mock') || key.includes('demo')) {
        console.log('[CLEAR-MOCK] Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      }
    });

    console.log('[CLEAR-MOCK] All potential mock data cleared');
  } catch (error) {
    console.error('[CLEAR-MOCK] Error clearing data:', error);
  }
}

// Auto-clear on import in development
if (import.meta.env.DEV) {
  clearAllMockData();
}
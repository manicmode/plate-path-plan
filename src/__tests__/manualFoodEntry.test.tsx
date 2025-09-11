import { render } from '@testing-library/react';
import { ManualFoodEntry } from '@/components/camera/ManualFoodEntry';
import { describe, it, expect, vi } from 'vitest';

// Mock all external dependencies
vi.mock('@/hooks/useManualFlowStatus');
vi.mock('@/utils/enrichCandidate');
vi.mock('@/components/camera/ManualPortionDialog');

describe('ManualFoodEntry Hook Order Stability', () => {
  it('should not crash with hook order error on re-renders', () => {
    const mockProps = {
      isOpen: true,
      onClose: vi.fn(),
      onResults: vi.fn()
    };

    // Mount component
    const { rerender } = render(<ManualFoodEntry {...mockProps} />);

    // Rerender 5 times to test hook stability
    for (let i = 0; i < 5; i++) {
      rerender(<ManualFoodEntry {...mockProps} />);
    }

    // If we get here without throwing, hook order is stable
    expect(true).toBe(true);
  });

  it('should render without throwing on initial mount', () => {
    const mockProps = {
      isOpen: true,
      onClose: vi.fn(),
      onResults: vi.fn()
    };

    expect(() => {
      render(<ManualFoodEntry {...mockProps} />);
    }).not.toThrow();
  });
});
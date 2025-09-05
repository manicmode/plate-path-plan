import React from 'react';

/**
 * Helper to make Cancel buttons safer by preventing default form submission
 * and stopping event propagation to avoid unintended side effects.
 */
export function withSafeCancel(fn: (e: React.MouseEvent) => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn(e);
  };
}
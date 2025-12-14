/**
 * Utility functions for formatting numbers and values
 */

/**
 * Format USD value with appropriate precision
 */
export function formatUsdValue(value: number): number {
  if (value === 0) return 0;
  if (value < 0.01) return Math.round(value * 10000) / 10000; // 4 decimal places for very small values
  if (value < 1) return Math.round(value * 1000) / 1000; // 3 decimal places for small values
  return Math.round(value * 100) / 100; // 2 decimal places for normal values
}

/**
 * Format token amount with appropriate precision based on decimals
 */
export function formatTokenAmount(amount: number, decimals: number): number {
  if (amount === 0) return 0;
  
  // For tokens with high decimals, limit display precision
  const maxDisplayDecimals = Math.min(decimals, 6);
  const multiplier = Math.pow(10, maxDisplayDecimals);
  return Math.round(amount * multiplier) / multiplier;
}

/**
 * Format percentage with 2 decimal places
 */
export function formatPercentage(percentage: number): number {
  return Math.round(percentage * 100) / 100;
}

/**
 * Ensure percentages sum to exactly 100%
 */
export function normalizePercentages(values: number[]): number[] {
  const total = values.reduce((sum, val) => sum + val, 0);
  
  if (total === 0) return values;
  
  // Scale all values to sum to 100
  const scaled = values.map(val => (val / total) * 100);
  
  // Round to 2 decimal places
  const rounded = scaled.map(val => Math.round(val * 100) / 100);
  
  // Adjust for rounding errors
  const roundedTotal = rounded.reduce((sum, val) => sum + val, 0);
  const difference = 100 - roundedTotal;
  
  if (Math.abs(difference) > 0.01) {
    // Find the largest value and adjust it
    const maxIndex = rounded.indexOf(Math.max(...rounded));
    if (maxIndex >= 0 && rounded[maxIndex] !== undefined) {
      rounded[maxIndex] += difference;
      rounded[maxIndex] = Math.round(rounded[maxIndex] * 100) / 100;
    }
  }
  
  return rounded;
}
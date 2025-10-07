/**
 * Utility functions for cleaning and formatting summary text
 */

/**
 * Cleans summary text by removing markdown formatting symbols
 * Removes asterisks (*) and hash symbols (#) from the text
 * @param summary - The raw summary text
 * @returns Cleaned summary text
 */
export function cleanSummaryText(summary: string): string {
  if (!summary) return '';
  
  return summary
    .replace(/\*+/g, '') // Remove all asterisks
    .replace(/#+/g, ''); // Remove all hash symbols
}

/**
 * Formats summary text for display
 * Cleans the text and ensures proper formatting
 * @param summary - The raw summary text
 * @returns Formatted summary text ready for display
 */
export function formatSummaryForDisplay(summary: string): string {
  return cleanSummaryText(summary);
}

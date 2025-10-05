/**
 * Swedish locale formatting utilities for the lease tracker.
 * All numbers use space as thousands separator, dates use YYYY-MM-DD format.
 */

/**
 * Format kilometers with Swedish locale (space as thousands separator).
 * Preserves decimal places if present, rounds to 1 decimal place for display.
 * @param km - Number of kilometers to format
 * @returns Formatted string like "1 234 km", "45 km", or "4 804,5 km"
 * @example formatKilometers(1234) => "1 234 km"
 * @example formatKilometers(45) => "45 km"
 * @example formatKilometers(4804.5) => "4 804,5 km"
 */
export function formatKilometers(km: number): string {
  // Round to 1 decimal place if there are decimals, otherwise show as integer
  const rounded = Math.round(km * 10) / 10
  const formatted = new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(rounded)
  return `${formatted} km`
}

/**
 * Parse Swedish-formatted number (with space separators) to a number.
 * Supports both integers and decimals (comma or dot as decimal separator).
 * Useful for parsing user input like "1 234" to 1234 or "4 804,5" to 4804.5.
 * @param value - String value that may contain spaces and decimal separator
 * @returns Parsed number, or NaN if invalid
 * @example parseSwedishNumber("1 234") => 1234
 * @example parseSwedishNumber("45") => 45
 * @example parseSwedishNumber("4 804,5") => 4804.5
 * @example parseSwedishNumber("4804.5") => 4804.5
 */
export function parseSwedishNumber(value: string): number {
  // Remove all spaces, replace comma with dot for decimal parsing
  const cleaned = value.replace(/\s/g, '').replace(',', '.')
  return parseFloat(cleaned)
}

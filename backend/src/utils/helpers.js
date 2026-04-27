/**
 * Async handler wrapper — catches rejected promises and forwards to Express error middleware.
 * @param {Function} fn - async route handler
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Generate a deterministic QR-code identifier for a service.
 * Format: <STORE_TYPE>-<last6 of serviceId>
 */
export function generateQrCodeId(storeType, serviceId) {
  const suffix = String(serviceId).slice(-6).toUpperCase();
  return `${storeType}-${suffix}`;
}

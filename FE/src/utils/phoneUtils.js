export const phoneRegex = /^(?:\+62|62|08)\d{8,12}$/;

/**
 * Normalizes an Indonesian phone number to the international +62 format.
 * Supports 08..., 62..., and +62... formats.
 * @param {string} phone - The raw phone number input
 * @returns {string} The normalized +62... phone number
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  let normalized = phone.trim().replace(/\s+/g, '').replace(/-/g, '');
  
  if (normalized.startsWith('08')) {
    normalized = '+62' + normalized.substring(1);
  } else if (normalized.startsWith('62')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
};

import api from './api';

/**
 * OCR Service Layer
 * All API calls related to prescription scanning.
 */

/**
 * Upload an image file for OCR processing.
 * @param {File} imageFile - The image file to scan.
 * @returns {Promise<{ id, text, image_url }>}
 */
export const scanPrescription = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await api.post('/ocr/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000, // OCR may take longer
  });
  return response.data;
};

/**
 * Fetch the user's OCR scan history.
 * @returns {Promise<Array<{ id, image_url, created_at }>>}
 */
export const getOcrHistory = async () => {
  const response = await api.get('/ocr/history');
  return response.data;
};

/**
 * Fetch a specific OCR scan result by ID.
 * @param {string|number} id - The scan record ID.
 * @returns {Promise<{ scan: { id, user_id, image_url, extracted_text, created_at } }>}
 */
export const getOcrResultById = async (id) => {
  const response = await api.get(`/ocr/result/${id}`);
  return response.data;
};

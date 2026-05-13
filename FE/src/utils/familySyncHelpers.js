const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(?:\+62|62|08)\d{8,12}$/;

export const validateIdentifier = (value) => {
  const normalized = value.trim();
  if (!normalized) {
    return { isValid: false, message: 'Email atau nomor telepon wajib diisi.', normalized };
  }

  if (!emailRegex.test(normalized) && !phoneRegex.test(normalized)) {
    return { isValid: false, message: 'Format email atau nomor telepon tidak valid.', normalized };
  }

  return { isValid: true, message: '', normalized };
};

export const formatRequestDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const resolveStatusMeta = (status) => {
  if (status === 'accepted') {
    return { label: 'Aktif', variant: 'active' };
  }
  return { label: 'Menunggu', variant: 'pending' };
};

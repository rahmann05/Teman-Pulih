import { useCallback, useEffect, useState } from 'react';
import { getFamilyMembers, getProfile, updateProfile } from '../services/profileService';

const phoneRegex = /^(?:\+62|62|08)\d{8,12}$/;

const buildFormState = (profile) => ({
  phone: profile?.phone || '',
  address: profile?.address || '',
  birth_date: profile?.birth_date ? String(profile.birth_date).split('T')[0] : '',
  gender: profile?.gender || '',
});

const sanitizePayload = (formState) => {
  const payload = {
    phone: formState.phone?.trim() || null,
    address: formState.address?.trim() || null,
    birth_date: formState.birth_date || null,
    gender: formState.gender || null,
  };

  return payload;
};

const validateProfileForm = (formState) => {
  if (formState.phone && !phoneRegex.test(formState.phone)) {
    return 'Format No. Telepon tidak valid';
  }
  return '';
};

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(buildFormState(null));

  const fetchProfile = useCallback(async () => {
    const profileResponse = await getProfile();
    const profileData = profileResponse.data?.profile || null;
    setProfile(profileData);
    setFormData(buildFormState(profileData));
  }, []);

  const fetchFamily = useCallback(async () => {
    const familyResponse = await getFamilyMembers();
    setFamilyMembers(familyResponse.data?.members || []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const [profileResponse, familyResponse] = await Promise.all([
          getProfile(),
          getFamilyMembers(),
        ]);

        if (cancelled) return;

        const profileData = profileResponse.data?.profile || null;
        setProfile(profileData);
        setFormData(buildFormState(profileData));
        setFamilyMembers(familyResponse.data?.members || []);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Gagal memuat profil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleEdit = useCallback((nextState) => {
    setIsEditing((prev) => {
      const desired = typeof nextState === 'boolean' ? nextState : !prev;
      if (prev && !desired) {
        setFormData(buildFormState(profile));
      }
      return desired;
    });
  }, [profile]);

  const saveProfile = useCallback(async (updates) => {
    const validationError = validateProfileForm(updates);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setIsSaving(true);
    setError('');

    try {
      const payload = sanitizePayload(updates);
      await updateProfile(payload);
      await fetchProfile();
      setIsEditing(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan profil.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [fetchProfile]);

  return {
    profile,
    familyMembers,
    loading,
    error,
    isEditing,
    isSaving,
    formData,
    setFormData,
    toggleEdit,
    saveProfile,
    fetchProfile,
    fetchFamily,
  };
};

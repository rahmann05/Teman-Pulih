import { useState } from 'react';
import api from '../services/api';

export const useEMRForm = (initialData, onSuccess) => {
  const [formData, setFormData] = useState({
    blood_type: initialData?.blood_type || '',
    height: initialData?.height || '',
    weight: initialData?.weight || '',
    blood_pressure_range: initialData?.blood_pressure_range || '',
    allergies: initialData?.allergies || '',
    chronic_conditions: initialData?.chronic_conditions || '',
    past_illnesses: initialData?.past_illnesses || '',
    last_illness: initialData?.last_illness || '',
    surgeries_history: initialData?.surgeries_history || '',
    routine_medications: initialData?.routine_medications || '',
    emergency_contact_name: initialData?.emergency_contact_name || '',
    emergency_contact_phone: initialData?.emergency_contact_phone || '',
    smoking_habit: initialData?.smoking_habit || false,
    alcohol_habit: initialData?.alcohol_habit || false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAutoFill = (parsedData) => {
    setFormData(prev => ({
      ...prev,
      blood_type: parsedData.blood_type || prev.blood_type,
      height: parsedData.height || prev.height,
      weight: parsedData.weight || prev.weight,
      blood_pressure_range: parsedData.blood_pressure_range || prev.blood_pressure_range,
      allergies: parsedData.allergies || prev.allergies,
      chronic_conditions: parsedData.chronic_conditions || prev.chronic_conditions,
      past_illnesses: parsedData.past_illnesses || prev.past_illnesses,
      last_illness: parsedData.last_illness || prev.last_illness,
      surgeries_history: parsedData.surgeries_history || prev.surgeries_history,
      routine_medications: parsedData.routine_medications || prev.routine_medications
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.patch('/profile', {
        ...formData,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseInt(formData.weight) : null,
        is_emr_completed: true
      });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan profil medis.');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    error,
    handleChange,
    handleAutoFill,
    handleSubmit
  };
};

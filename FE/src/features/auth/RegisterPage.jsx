// src/features/auth/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/auth/AuthLayout';
import AuthInputField from '../../components/ui/auth/AuthInputField';
import SocialLoginButton from '../../components/ui/auth/SocialLoginButton';
import AuthDivider from '../../components/ui/auth/AuthDivider';
import AuthFormHeader from '../../components/ui/auth/AuthFormHeader';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!fullName) return 'Nama lengkap wajib diisi';
    if (!email) return 'Email wajib diisi';
    if (!phone) return 'No. Telepon wajib diisi';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(?:\+62|62|08)\d{8,12}$/;

    if (!emailRegex.test(email)) {
      return 'Format Email tidak valid (harus menggunakan email untuk ini)';
    }

    if (!phoneRegex.test(phone)) {
      return 'Format No. Telepon tidak valid';
    }

    if (!password) return 'Kata sandi wajib diisi';
    if (password.length < 6) return 'Kata sandi minimal 6 karakter';

    if (password !== confirmPassword) {
      return 'Konfirmasi kata sandi tidak cocok';
    }

    return '';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Hit the backend endpoint
      const response = await api.post('/auth/register', {
        name: fullName,
        email,
        phone,
        password: password
      });

      // 2. Apabila auto login dari respon session register Supabase:
      // (Backend kita mengembalikan user dan session di register)
      if (response.data.session && response.data.session.access_token) {
        const resolvedRole = response.data.user?.role || 'patient';
        login(response.data.session.access_token, resolvedRole);
        navigate(resolvedRole === 'caregiver' ? '/caregiver/dashboard' : '/dashboard');
      } else {
        // Jika butuh email confirmation dulu
        setError('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi atau coba login.');
        // navigate('/login'); // Opsional: redirect ke login
      }

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Terjadi kesalahan saat mendaftar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthFormHeader
        title="Daftar Akun"
        subtitle="Mulai perjalanan pemulihan Anda"
      />

      <SocialLoginButton provider="Google" onClick={() => console.log('Google register')} />

      <AuthDivider text="atau daftar dengan email" />

      <form onSubmit={handleRegister} noValidate>
        <AuthInputField
          label="NAMA LENGKAP"
          placeholder="Masukkan nama lengkap"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <AuthInputField
          label="EMAIL"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthInputField
          label="NO. TELEPON"
          placeholder="08... atau +62..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <AuthInputField
          label="KATA SANDI"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthInputField
          label="KONFIRMASI KATA SANDI"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={error}
        />

        <button type="submit" className="btn-primary auth-btn-primary" disabled={loading}>
          {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
        Sudah punya akun? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Masuk</Link>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;

// src/features/auth/RegisterPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/auth/AuthLayout';
import AuthToggle from '../../components/ui/auth/AuthToggle';
import AuthInputField from '../../components/ui/auth/AuthInputField';
import SocialLoginButton from '../../components/ui/auth/SocialLoginButton';
import AuthDivider from '../../components/ui/auth/AuthDivider';
import AuthFormHeader from '../../components/ui/auth/AuthFormHeader';

const RegisterPage = () => {
  const [role, setRole] = useState('pasien');
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    if (!fullName) return 'Nama lengkap wajib diisi';
    if (!identifier) return 'Email atau No. Telepon wajib diisi';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(?:\+62|08)\d{8,11}$/;

    const isEmail = emailRegex.test(identifier);
    const isPhone = phoneRegex.test(identifier);

    if (!isEmail && !isPhone) {
      return 'Format Email atau No. Telepon tidak valid';
    }

    if (!password) return 'Kata sandi wajib diisi';
    if (password.length < 8) return 'Kata sandi minimal 8 karakter';

    if (password !== confirmPassword) {
      return 'Konfirmasi kata sandi tidak cocok';
    }

    return '';
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    console.log('Registering...', { role, fullName, identifier, password });
  };

  return (
    <AuthLayout>
      <AuthFormHeader
        title="Daftar Akun"
        subtitle="Mulai perjalanan pemulihan Anda"
      />

      <AuthToggle role={role} setRole={setRole} />

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
          label="EMAIL / NO. TELEPON"
          placeholder="nama@email.com atau 08..."
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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

        <button type="submit" className="btn-primary">Daftar Sekarang</button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
        Sudah punya akun? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Masuk</Link>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;

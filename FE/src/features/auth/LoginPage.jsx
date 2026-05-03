// src/features/auth/LoginPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/auth/AuthLayout';
import AuthToggle from '../../components/ui/auth/AuthToggle';
import AuthInputField from '../../components/ui/auth/AuthInputField';
import SocialLoginButton from '../../components/ui/auth/SocialLoginButton';
import AuthDivider from '../../components/ui/auth/AuthDivider';
import AuthFormHeader from '../../components/ui/auth/AuthFormHeader';

const LoginPage = () => {
  const [role, setRole] = useState('pasien');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
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

    return '';
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    console.log('Logging in...', { role, identifier, password });
  };

  return (
    <AuthLayout>
      <AuthFormHeader
        title="Selamat Datang"
        subtitle="Masuk ke akun Teman Pulih Anda"
      />

      <AuthToggle role={role} setRole={setRole} />

      <SocialLoginButton onClick={() => console.log('Google login')} />

      <AuthDivider />

      <form onSubmit={handleLogin} noValidate>
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
          error={error}
        />

        <button type="submit" className="auth-btn-primary">Masuk</button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
        Belum punya akun? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Daftar</Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;

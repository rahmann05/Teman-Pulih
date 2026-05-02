// src/features/auth/LoginPage.jsx
import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import AuthLayout from './AuthLayout';
import AuthToggle from './AuthToggle';

const LoginPage = () => {
  const [role, setRole] = useState('pasien');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validate = () => {
    if (!identifier) return 'Email atau No. Telepon wajib diisi';
    if (!password) return 'Kata sandi wajib diisi';
    // Add regex for email/phone if desired, but start simple
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
      <div className="auth-form-header">
        <h1>Selamat Datang</h1>
        <p>Masuk ke akun Teman Pulih Anda</p>
      </div>

      <AuthToggle role={role} setRole={setRole} />

      <button type="button" className="social-login">
        <FcGoogle size={20} />
        Lanjutkan dengan Google
      </button>

      <div className="auth-divider">atau gunakan email</div>

      <form onSubmit={handleLogin} noValidate>
        <div className="form-group">
          <label>EMAIL / NO. TELEPON</label>
          <input 
            type="text" 
            placeholder="nama@email.com atau 08..." 
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>KATA SANDI</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        {error && <p className="error-msg">{error}</p>}

        <button type="submit" className="btn-primary">Masuk</button>
      </form>
      
      <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
        Belum punya akun? <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Daftar</span>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;

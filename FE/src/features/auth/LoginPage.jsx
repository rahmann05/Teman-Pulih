// src/features/auth/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '../../components/layout/auth/AuthLayout';
import AuthToggle from '../../components/ui/auth/AuthToggle';
import AuthInputField from '../../components/ui/auth/AuthInputField';
import SocialLoginButton from '../../components/ui/auth/SocialLoginButton';
import AuthDivider from '../../components/ui/auth/AuthDivider';
import AuthFormHeader from '../../components/ui/auth/AuthFormHeader';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const LoginPage = () => {
  const [role, setRole] = useState('pasien');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    if (!identifier) return 'Email atau No. Telepon wajib diisi';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(?:\+62|62|08)\d{8,12}$/;

    const isEmail = emailRegex.test(identifier);
    const isPhone = phoneRegex.test(identifier);

    if (!isEmail && !isPhone) {
      return 'Format Email atau No. Telepon tidak valid';
    }

    if (!password) return 'Kata sandi wajib diisi';
    if (password.length < 8) return 'Kata sandi minimal 8 karakter';

    return '';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
        role: role === 'pasien' ? 'patient' : role
      });
      const resolvedRole = data.user?.role || role;
      login(data.token, resolvedRole);
      navigate(resolvedRole === 'caregiver' ? '/caregiver/dashboard' : '/dashboard');
    } catch (err) {
      const message = err.response?.data?.error || 'Login gagal. Coba lagi.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Define animation variants for the form
  const formVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
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

      <AnimatePresence mode="wait">
        <motion.form 
          key={role}
          onSubmit={handleLogin} 
          noValidate
          variants={formVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <AuthInputField
            label="EMAIL / NO. TELEPON"
            placeholder="nama@email.com atau 08..."
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (error) setError('');
            }}
          />

          <AuthInputField
            label="KATA SANDI"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            error={error}
          />

          <motion.button 
            type="submit" 
            className="btn-primary auth-btn-primary" 
            disabled={loading}
            whileHover={{ scale: 1.02, backgroundColor: 'var(--accent-hover, var(--accent))' }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </motion.button>
        </motion.form>
      </AnimatePresence>

      <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
        Belum punya akun? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Daftar</Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;

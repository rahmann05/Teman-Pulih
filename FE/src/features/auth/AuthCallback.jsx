import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('--- Auth Callback Started ---');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Supabase getSession error:', sessionError);
          throw sessionError;
        }
        
        if (!session) {
          console.warn('No session found in Supabase');
          throw new Error('Tidak ada sesi ditemukan. Silakan login kembali.');
        }

        console.log('Supabase session found, syncing with backend...');
        const role = localStorage.getItem('oauth_role') || 'patient';
        
        // Kirim access_token ke backend untuk diverifikasi dan disinkronkan
        const { data } = await api.post('/auth/oauth-login', {
          access_token: session.access_token,
          role: role
        });

        console.log('Backend sync successful:', data);

        const resolvedRole = data.user?.role || role;
        login(data.token, resolvedRole, data.allowed_roles, data.user, session.refresh_token);
        
        // Bersihkan role sementara
        localStorage.removeItem('oauth_role');
        
        navigate(resolvedRole === 'caregiver' ? '/caregiver/dashboard' : '/dashboard');
      } catch (err) {
        console.error('OAuth Callback Error:', err);
        const errorMsg = err.response?.data?.error || err.message || 'Gagal memproses login Google.';
        setError(errorMsg);
        // Jangan langsung redirect agar user bisa baca errornya
        // setTimeout(() => navigate('/login'), 5000);
      }
    };

    handleAuthCallback();
  }, [navigate, login]);

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', textAlign: 'center', padding: '20px' }}>
        <h2 style={{ color: 'var(--error)' }}>Autentikasi Gagal</h2>
        <p>{error}</p>
        <p>Mengalihkan ke halaman login...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <div className="loader-shimmer" style={{ width: '100px', height: '10px', borderRadius: '5px', marginBottom: '20px' }}></div>
      <h2 style={{ color: 'var(--primary)', margin: 0 }}>Memverifikasi Akun...</h2>
    </div>
  );
};

export default AuthCallback;

// src/components/ui/auth/SocialLoginButton.jsx
import { FcGoogle } from 'react-icons/fc';

const SocialLoginButton = ({ provider = 'Google', onClick }) => {
  return (
    <button type="button" className="social-login" onClick={onClick}>
      {provider === 'Google' && <FcGoogle size={20} />}
      Lanjutkan dengan {provider}
    </button>
  );
};

export default SocialLoginButton;

// src/components/ui/auth/SocialLoginButton.jsx
import { FcGoogle } from 'react-icons/fc';
import { motion } from 'framer-motion';

const SocialLoginButton = ({ provider = 'Google', onClick }) => {
  return (
    <motion.button
      type="button"
      className="social-login"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
    >
      {provider === 'Google' && <FcGoogle size={20} />}
      Lanjutkan dengan {provider}
    </motion.button>
  );
};

export default SocialLoginButton;

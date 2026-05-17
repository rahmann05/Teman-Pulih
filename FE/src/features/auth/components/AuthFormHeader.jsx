// src/components/ui/auth/AuthFormHeader.jsx
const AuthFormHeader = ({ title, subtitle }) => {
  return (
    <div className="auth-form-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
};

export default AuthFormHeader;

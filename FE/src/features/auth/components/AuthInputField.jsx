// src/components/ui/auth/AuthInputField.jsx
const AuthInputField = ({ label, type = 'text', placeholder, value, onChange, error }) => {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="off"
      />
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
};

export default AuthInputField;

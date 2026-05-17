/* src/components/ui/profile/ProfileField.jsx */

const ProfileField = ({ 
  label, 
  value, 
  isEditing, 
  id, 
  type = 'text', 
  onChange, 
  placeholder, 
  options = [],
  isEmpty = false,
  rows = 1
}) => {
  if (!isEditing) {
    return (
      <div className="profile-field">
        <span className="profile-field-label">{label}</span>
        <span className={`profile-field-value${isEmpty ? ' empty' : ''}`}>
          {value || '-'}
        </span>
      </div>
    );
  }

  return (
    <div className="profile-field">
      <label className="profile-field-label" htmlFor={id}>{label}</label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          className="profile-field-input profile-field-textarea"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
        />
      ) : type === 'select' ? (
        <select
          id={id}
          className="profile-field-select"
          value={value}
          onChange={onChange}
        >
          <option value="">Pilih</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className="profile-field-input"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

export default ProfileField;

/* src/components/ui/scan/EditableResult.jsx */

const EditableResult = ({ label, value, onChange, placeholder }) => {
  return (
    <div className="scan-result-text-card">
      <span className="scan-result-label">{label}</span>
      <textarea
        className="scan-result-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
};

export default EditableResult;

import React, { useState } from 'react';

const ChipSelector = ({ presets, selected, onChange, placeholder }) => {
  const [customInput, setCustomInput] = useState('');

  const toggle = (item) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
    }
    setCustomInput('');
  };

  return (
    <div className="emr-chip-group">
      <div className="emr-chips-row">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={`emr-chip${selected.includes(p) ? ' active' : ''}`}
            onClick={() => toggle(p)}
          >
            {p}
          </button>
        ))}
      </div>
      {/* Custom input */}
      <div className="emr-chip-custom-row">
        <input
          type="text"
          className="emr-chip-custom-input"
          placeholder={placeholder || 'Tambah lainnya...'}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
        />
        <button type="button" className="emr-chip-add-btn" onClick={addCustom}>+</button>
      </div>
      {selected.length > 0 && (
        <div className="emr-chips-selected">
          {selected.map((s) => (
            <span key={s} className="emr-chip active">
              {s}
              <button
                type="button"
                className="emr-chip-remove"
                onClick={() => toggle(s)}
                aria-label={`Hapus ${s}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChipSelector;

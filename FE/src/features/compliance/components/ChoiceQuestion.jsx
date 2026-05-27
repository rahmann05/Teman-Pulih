import React from 'react';

const ChoiceQuestion = ({ label, fieldName, value, onChange, options }) => {
    return (
        <div className="compliance-form-group">
            <label htmlFor={fieldName}>{label}</label>
            <select
                id={fieldName}
                className="compliance-select"
                value={value}
                onChange={(e) => onChange(fieldName, e.target.value)}
            >
                <option value="">-- Pilih opsi --</option>
                {options.map((opt) => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    return (
                        <option key={optVal} value={optVal}>
                            {optLabel}
                        </option>
                    );
                })}
            </select>
        </div>
    );
};

export default ChoiceQuestion;

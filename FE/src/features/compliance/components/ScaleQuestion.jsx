import React from 'react';

const ScaleQuestion = ({ questionText, fieldName, value, onChange }) => {
    const SCALE_OPTIONS = [
        { value: 1, label: '1 (Sangat Buruk)' },
        { value: 2, label: '2 (Buruk)' },
        { value: 3, label: '3 (Sedang)' },
        { value: 4, label: '4 (Baik)' },
        { value: 5, label: '5 (Sangat Baik)' }
    ];

    return (
        <div className="compliance-question-card">
            <p className="compliance-question-text">{questionText}</p>
            <div className="compliance-scale-container">
                <div className="compliance-scale-options">
                    {SCALE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`compliance-scale-button ${value === opt.value ? 'selected' : ''}`}
                            onClick={() => onChange(fieldName, opt.value)}
                            title={opt.label}
                        >
                            <span className="compliance-scale-number">{opt.value}</span>
                        </button>
                    ))}
                </div>
                <div className="compliance-scale-anchors">
                    <span className="compliance-scale-anchor">1 (Sangat Lupa / Buruk)</span>
                    <span className="compliance-scale-anchor">5 (Tidak Pernah / Sangat Baik)</span>
                </div>
            </div>
        </div>
    );
};

export default ScaleQuestion;


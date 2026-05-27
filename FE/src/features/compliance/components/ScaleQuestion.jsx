import React from 'react';
import { LuFrown, LuMeh, LuSmile } from 'react-icons/lu';

const ScaleQuestion = ({ questionText, fieldName, value, onChange }) => {
    const getIcon = (val) => {
        if (val <= 2) return <LuFrown className="compliance-scale-emoji" size={24} style={{ color: val === 1 ? 'var(--error)' : 'var(--warning)' }} />;
        if (val === 3) return <LuMeh className="compliance-scale-emoji" size={24} style={{ color: 'var(--text-muted)' }} />;
        return <LuSmile className="compliance-scale-emoji" size={24} style={{ color: 'var(--success)' }} />;
    };

    const SCALE_OPTIONS = [
        { value: 1, label: '1 (Sangat Buruk)' },
        { value: 2, label: '2 (Buruk)' },
        { value: 3, label: '3 (Sedang/Netral)' },
        { value: 4, label: '4 (Baik)' },
        { value: 5, label: '5 (Sangat Baik)' }
    ];

    return (
        <div className="compliance-question-card">
            <p className="compliance-question-text">{questionText}</p>
            <div className="compliance-scale-options">
                {SCALE_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        className={`compliance-scale-button ${value === opt.value ? 'selected' : ''}`}
                        onClick={() => onChange(fieldName, opt.value)}
                        title={opt.label}
                    >
                        {getIcon(opt.value)}
                        <span className="compliance-scale-number">{opt.value}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ScaleQuestion;

import React, { useState, useRef, useEffect } from 'react';
import { LuChevronDown } from 'react-icons/lu';

const ChoiceQuestion = ({ label, fieldName, value, onChange, options, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Get current label based on selected value
    const selectedOption = options.find(opt => {
        const optVal = typeof opt === 'object' ? opt.value : opt;
        return optVal === value;
    });

    const displayLabel = selectedOption
        ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
        : '-- Pilih opsi --';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        onChange(fieldName, val);
        setIsOpen(false);
    };

    return (
        <div className="compliance-form-group" ref={dropdownRef}>
            <label>{label}</label>
            <div className="compliance-custom-dropdown-container">
                <button
                    type="button"
                    className={`compliance-custom-dropdown-trigger ${isOpen ? 'open' : ''} ${value ? 'has-value' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <span>{displayLabel}</span>
                    <LuChevronDown className="dropdown-arrow-icon" />
                </button>

                {isOpen && (
                    <div className="compliance-custom-dropdown-options">
                        <div
                            className={`compliance-custom-dropdown-option placeholder ${!value ? 'selected' : ''}`}
                            onClick={() => handleSelect('')}
                        >
                            -- Pilih opsi --
                        </div>
                        {options.map((opt) => {
                            const optVal = typeof opt === 'object' ? opt.value : opt;
                            const optLabel = typeof opt === 'object' ? opt.label : opt;
                            const isSelected = optVal === value;

                            return (
                                <div
                                    key={optVal}
                                    className={`compliance-custom-dropdown-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleSelect(optVal)}
                                >
                                    {optLabel}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChoiceQuestion;

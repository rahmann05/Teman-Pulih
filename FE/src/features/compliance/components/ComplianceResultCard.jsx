import React from 'react';

const ComplianceResultCard = ({ adherenceClass, behaviourClass, perceptionClass }) => {
    const getAdherenceStatus = () => {
        if (adherenceClass === 1) return { label: 'Patuh', style: 'success' };
        return { label: 'Tidak Patuh', style: 'danger' };
    };

    const getBehaviourStatus = () => {
        if (behaviourClass === 1) return { label: 'Positif (Baik)', style: 'success' };
        return { label: 'Negatif (Perlu Koreksi)', style: 'danger' };
    };

    const getPerceptionStatus = () => {
        if (perceptionClass === 2) return { label: 'Positif', style: 'success' };
        if (perceptionClass === 1) return { label: 'Netral', style: 'warning' };
        return { label: 'Negatif (Ragu/Khawatir)', style: 'danger' };
    };

    const adh = getAdherenceStatus();
    const beh = getBehaviourStatus();
    const pct = getPerceptionStatus();

    return (
        <div className="compliance-dimension-cards">
            <div className={`compliance-dimension-card ${adh.style}`}>
                <span className="compliance-dimension-title">Pilar 1: Kepatuhan Minum Obat</span>
                <span className="compliance-dimension-value">{adh.label}</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Mengukur tingkat kedisiplinan minum obat sesuai petunjuk resep dokter.
                </p>
            </div>

            <div className={`compliance-dimension-card ${beh.style}`}>
                <span className="compliance-dimension-title">Pilar 2: Perilaku Harian</span>
                <span className="compliance-dimension-value">{beh.label}</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Mengukur kebiasaan Anda dalam menjaga jadwal dan menghindari lupa.
                </p>
            </div>

            <div className={`compliance-dimension-card ${pct.style}`}>
                <span className="compliance-dimension-title">Pilar 3: Persepsi Efektivitas</span>
                <span className="compliance-dimension-value">{pct.label}</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Mengukur keyakinan Anda terhadap manfaat klinis obat bagi pemulihan.
                </p>
            </div>
        </div>
    );
};

export default ComplianceResultCard;

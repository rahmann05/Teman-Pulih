import StatCard from '../../ui/landing/StatCard';

const STATS_DATA = [
  {
    value: '30–50%',
    description: 'Pasien tidak patuh minum obat setelah rawat inap',
    delayClass: 'd1'
  },
  {
    value: '1/3',
    description: 'Pasien salah memahami instruksi resep dokter',
    delayClass: 'd2'
  },
  {
    value: '24/7',
    description: 'Akses chatbot medis kapan saja dibutuhkan',
    delayClass: 'd3'
  },
  {
    value: '2 min',
    description: 'Waktu rata-rata scan dan terjemahkan resep obat',
    delayClass: 'd4'
  }
];

const LandingStats = () => {
  return (
    <section className="stats">
      <div className="stats-header reveal">
        <div className="stats-label">Kenapa Ini Penting</div>
        <h2 className="stats-title">Fakta Pemulihan</h2>
      </div>
      <div className="stats-grid">
        {STATS_DATA.map((stat, index) => (
          <StatCard 
            key={index}
            value={stat.value}
            description={stat.description}
            delayClass={stat.delayClass}
          />
        ))}
      </div>
    </section>
  );
};

export default LandingStats;

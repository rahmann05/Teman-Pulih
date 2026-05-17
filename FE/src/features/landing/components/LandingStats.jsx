const STATS_DATA = [
  {
    value: '30–50%',
    description: 'Pasien tidak patuh minum obat setelah rawat inap',
  },
  {
    value: '1/3',
    description: 'Pasien salah memahami instruksi resep dokter',
  },
  {
    value: '24/7',
    description: 'Akses chatbot medis kapan saja dibutuhkan',
  },
  {
    value: '2 min',
    description: 'Waktu rata-rata scan dan terjemahkan resep obat',
  },
];

const LandingStats = () => {
  return (
    <section className="stats" id="facts">
      <div className="stats-header reveal">
        <h2 className="section-huge-title">Fakta Pemulihan</h2>
        <p className="section-subtitle">Mengapa kami membangun Teman Pulih</p>
      </div>
      <div className="stats-grid">
        {STATS_DATA.map((stat, index) => (
          <div key={index} className={`stat stat--c${index + 1} reveal`}>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-desc">{stat.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LandingStats;

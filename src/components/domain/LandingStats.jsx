const LandingStats = () => {
  return (
    <section className="stats">
      <div className="stats-header reveal">
        <div className="stats-label">Kenapa Ini Penting</div>
        <h2 className="stats-title">Fakta Pemulihan</h2>
      </div>
      <div className="stats-grid">
        <div className="stat reveal d1">
          <div className="stat-value">30–50%</div>
          <div className="stat-desc">Pasien tidak patuh minum obat setelah rawat inap</div>
        </div>
        <div className="stat reveal d2">
          <div className="stat-value">1/3</div>
          <div className="stat-desc">Pasien salah memahami instruksi resep dokter</div>
        </div>
        <div className="stat reveal d3">
          <div className="stat-value">24/7</div>
          <div className="stat-desc">Akses chatbot medis kapan saja dibutuhkan</div>
        </div>
        <div className="stat reveal d4">
          <div className="stat-value">2 min</div>
          <div className="stat-desc">Waktu rata-rata scan dan terjemahkan resep obat</div>
        </div>
      </div>
    </section>
  )
}

export default LandingStats

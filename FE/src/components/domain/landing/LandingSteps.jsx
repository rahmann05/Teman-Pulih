const LandingSteps = () => {
  return (
    <section className="steps">
      <div className="steps-header reveal">
        <div className="steps-label">Cara Kerja</div>
        <h2 className="steps-title">Tiga Langkah Mudah</h2>
      </div>
      <div className="steps-list">
        <div className="step reveal d1">
          <div className="step-num">1</div>
          <h3 className="step-name">Buat Profil</h3>
          <p className="step-text">
            Daftar sebagai Pasien atau Caregiver. Tambahkan data dasar untuk pengalaman yang dipersonalisasi.
          </p>
        </div>
        <div className="step reveal d2">
          <div className="step-num">2</div>
          <h3 className="step-name">Scan Resep Anda</h3>
          <p className="step-text">
            Ambil foto etiket obat. AI membaca dan menjelaskan setiap instruksi dalam bahasa yang mudah dipahami.
          </p>
        </div>
        <div className="step reveal d3">
          <div className="step-num">3</div>
          <h3 className="step-name">Pantau & Pulih</h3>
          <p className="step-text">
            Terima pengingat, pantau progres kepatuhan, dan tanyakan hal medis ke chatbot AI kapan saja.
          </p>
        </div>
      </div>
    </section>
  );
};

export default LandingSteps;

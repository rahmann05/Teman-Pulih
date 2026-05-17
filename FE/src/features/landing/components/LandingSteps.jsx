const STEPS_DATA = [
  {
    number: '01.',
    title: 'Buat Profil',
    text: 'Daftar sebagai Pasien atau Caregiver. Tambahkan data dasar untuk pengalaman yang dipersonalisasi.',
  },
  {
    number: '02.',
    title: 'Scan Resep Anda',
    text: 'Ambil foto etiket obat. AI membaca dan menjelaskan setiap instruksi dalam bahasa yang mudah dipahami.',
  },
  {
    number: '03.',
    title: 'Pantau & Pulih',
    text: 'Terima pengingat, pantau progres kepatuhan, dan tanyakan hal medis ke chatbot AI kapan saja.',
  },
];

const LandingSteps = () => {
  return (
    <section className="steps" id="how-it-works">
      <div className="steps-header reveal">
        <h2 className="section-huge-title">Tiga Langkah</h2>
        <p className="section-subtitle">Memulai dengan Teman Pulih ↓</p>
      </div>

      {/* Desktop/Tablet: 3-column grid, pure typography */}
      <div className="steps-list steps-list--desktop">
        {STEPS_DATA.map((step, index) => (
          <div key={index} className="step reveal">
            <div className="step-num">{step.number}</div>
            <h3 className="step-name">{step.title}</h3>
            <p className="step-text">{step.text}</p>
          </div>
        ))}
      </div>

      {/* Mobile: Vertical timeline with circle badges */}
      <div className="steps-list steps-list--mobile">
        {STEPS_DATA.map((step, index) => (
          <div key={index} className="step-timeline-item reveal">
            <div className="step-timeline-marker">
              <div className="step-circle">{step.number.replace('.', '')}</div>
              {index < STEPS_DATA.length - 1 && <div className="step-timeline-line" />}
            </div>
            <div className="step-timeline-content">
              <h3 className="step-timeline-title">{step.title}</h3>
              <p className="step-timeline-text">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LandingSteps;

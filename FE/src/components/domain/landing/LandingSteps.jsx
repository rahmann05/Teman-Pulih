import StepItem from '../../ui/landing/StepItem';

const STEPS_DATA = [
  {
    number: 1,
    title: 'Buat Profil',
    text: 'Daftar sebagai Pasien atau Caregiver. Tambahkan data dasar untuk pengalaman yang dipersonalisasi.',
    delayClass: 'd1'
  },
  {
    number: 2,
    title: 'Scan Resep Anda',
    text: 'Ambil foto etiket obat. AI membaca dan menjelaskan setiap instruksi dalam bahasa yang mudah dipahami.',
    delayClass: 'd2'
  },
  {
    number: 3,
    title: 'Pantau & Pulih',
    text: 'Terima pengingat, pantau progres kepatuhan, dan tanyakan hal medis ke chatbot AI kapan saja.',
    delayClass: 'd3'
  }
];

const LandingSteps = () => {
  return (
    <section className="steps">
      <div className="steps-header reveal">
        <div className="steps-label">Cara Kerja</div>
        <h2 className="steps-title">Tiga Langkah Mudah</h2>
      </div>
      <div className="steps-list">
        {STEPS_DATA.map((step) => (
          <StepItem
            key={step.number}
            number={step.number}
            title={step.title}
            text={step.text}
            delayClass={step.delayClass}
          />
        ))}
      </div>
    </section>
  );
};

export default LandingSteps;

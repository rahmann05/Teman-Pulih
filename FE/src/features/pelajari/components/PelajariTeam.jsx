const img1 = 'https://placehold.co/600x800/F4F1ED/3D5C4D?text=Dr.+Andreas';
const img2 = 'https://placehold.co/600x800/F4F1ED/C4653A?text=Siti+Rahma';
const img3 = 'https://placehold.co/600x800/F4F1ED/3D5C4D?text=Budi+Santoso';

const team = [
  { id: 1, name: 'Dr. Andreas, Sp.KJ', role: 'Chief Medical Advisor',   img: img1, bg: '#1A1A2E' },
  { id: 2, name: 'Siti Rahma, M.Psi',  role: 'Clinical Psychologist',   img: img2, bg: '#3D5C4D' },
  { id: 3, name: 'Budi Santoso',        role: 'Head of Patient Security', img: img3, bg: '#9E4E2A' },
];

const PelajariTeam = () => (
  <section data-theme="dark">
    <div className="p-team-intro" data-theme="light">
      <h2>Pakar medis di balik setiap algoritma kami.</h2>
    </div>

    <div style={{ position: 'relative' }}>
      {team.map((m, i) => (
        <div
          key={m.id}
          className="p-team-card"
          style={{ zIndex: i, backgroundColor: m.bg }}
        >
          <img src={m.img} alt={m.name} />
          <div className="p-team-card-overlay" />
          <div className="p-team-card-info">
            <h3 className="p-team-card-name">{m.name}</h3>
            <p className="p-team-card-role">{m.role}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default PelajariTeam;

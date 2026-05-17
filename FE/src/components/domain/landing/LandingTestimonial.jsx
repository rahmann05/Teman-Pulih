import { LuQuote } from 'react-icons/lu';

const TESTIMONIALS = [
  {
    initials: 'RS',
    name: 'Rina Sari',
    role: 'Caregiver · Jakarta',
    quote:
      'Sejak pakai Teman Pulih, saya tidak pernah lagi lupa jadwal obat Ibu. Fitur Family Sync-nya sangat membantu kami sekeluarga memantau pemulihan.',
  },
  {
    initials: 'BH',
    name: 'Budi Hartono',
    role: 'Pasien · Bandung',
    quote:
      'OCR resep-nya akurat sekali. Saya yang biasa bingung baca tulisan dokter sekarang bisa langsung tahu nama obat dan dosisnya dalam hitungan detik.',
  },
  {
    initials: 'DA',
    name: 'Dewi Astuti',
    role: 'Pasien · Surabaya',
    quote:
      'Chatbot AI-nya sabar banget menjawab pertanyaan saya tengah malam soal efek samping obat. Terasa seperti punya dokter pribadi 24 jam.',
  },
  {
    initials: 'MR',
    name: 'Muhammad Rizki',
    role: 'Caregiver · Medan',
    quote:
      'Awalnya skeptis, tapi setelah coba selama sebulan, kepatuhan minum obat ayah saya meningkat drastis. Rekomendasi banget buat semua caregiver.',
  },
];

const LandingTestimonial = () => {
  return (
    <section className="testimonial" id="testimonial">
      <div className="testimonial-header reveal">
        <span className="testimonial-label">Cerita Pengguna</span>
        <h2 className="testimonial-title">Mereka Sudah Merasakannya</h2>
        <p className="testimonial-subtitle">
          Ribuan pasien dan caregiver telah memulai perjalanan pemulihan yang lebih terstruktur bersama Teman Pulih.
        </p>
      </div>

      <div className="testimonial-grid">
        {TESTIMONIALS.map((t, i) => (
          <div key={i} className="t-card reveal">
            <LuQuote className="t-card-quote-icon" aria-hidden="true" />
            <p className="t-card-text">{t.quote}</p>
            <div className="t-card-author">
              <div className="t-card-avatar">{t.initials}</div>
              <div className="t-card-info">
                <div className="t-card-name">{t.name}</div>
                <div className="t-card-role">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LandingTestimonial;


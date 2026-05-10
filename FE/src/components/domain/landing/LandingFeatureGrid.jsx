import { HiOutlineChevronRight } from 'react-icons/hi2';
import featureScan from '../../../assets/images/feature-scan.png';
import featureMeds from '../../../assets/images/feature-medication.png';
import featureChat from '../../../assets/images/feature-chatbot.png';

const LandingFeatureGrid = () => {
  return (
    <section className="features">
      <h2 className="features-title reveal">Layanan Kami</h2>

      <div className="features-grid">
        {/* Large card */}
        <div className="f-card reveal d1">
          <img src={featureScan} alt="Scan resep obat" className="f-card-img" />
          <div className="f-card-overlay" />
          <div className="f-card-content">
            <div className="f-card-label">Deep OCR</div>
            <div className="f-card-name">Scan Resep<br />Obat</div>
          </div>
          <button className="f-card-btn" type="button" aria-label="Lihat detail scan resep">
            <HiOutlineChevronRight size={18} />
          </button>
        </div>

        {/* Two column row */}
        <div className="features-row">
          <div className="f-card reveal d2">
            <img src={featureMeds} alt="Pengingat obat" className="f-card-img" />
            <div className="f-card-overlay" />
            <div className="f-card-content">
              <div className="f-card-label">Otomatis</div>
              <div className="f-card-name">Pengingat Obat</div>
            </div>
            <button className="f-card-btn" type="button" aria-label="Lihat detail pengingat obat">
              <HiOutlineChevronRight size={18} />
            </button>
          </div>

          <div className="f-card reveal d3">
            <img src={featureChat} alt="Chatbot medis AI" className="f-card-img" />
            <div className="f-card-overlay" />
            <div className="f-card-content">
              <div className="f-card-label">MedGemma</div>
              <div className="f-card-name">Chatbot AI</div>
            </div>
            <button className="f-card-btn" type="button" aria-label="Lihat detail chatbot AI">
              <HiOutlineChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingFeatureGrid;

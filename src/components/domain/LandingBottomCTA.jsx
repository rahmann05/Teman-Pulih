import { HiOutlineArrowRight, HiOutlineShieldCheck } from 'react-icons/hi2'

const LandingBottomCTA = () => {
  return (
    <section className="cta-section">
      <div className="cta-card reveal">
        <div className="cta-icon">
          <HiOutlineShieldCheck size={28} />
        </div>
        <h2 className="cta-title">Siap Memulai Pemulihan?</h2>
        <p className="cta-desc">
          Bergabung dengan pasien dan caregiver yang telah mempercayakan pemulihan mereka bersama Teman Pulih.
        </p>
        <button className="cta-btn" type="button">
          Daftar Gratis <HiOutlineArrowRight size={16} />
        </button>
      </div>
    </section>
  )
}

export default LandingBottomCTA

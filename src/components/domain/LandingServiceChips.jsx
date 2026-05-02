import { 
  LuScanLine, 
  LuClock, 
  LuMessageCircle, 
  LuUsers, 
  LuActivity 
} from 'react-icons/lu'

const LandingServiceChips = () => {
  return (
    <section className="chips-section reveal">
      <div className="chips-scroll" role="tablist" aria-label="Layanan">
        <button className="chip active" role="tab" aria-selected="true">
          <LuActivity size={14} /> Semua Layanan
        </button>
        <button className="chip" role="tab" aria-selected="false">
          <LuScanLine size={14} /> OCR Resep
        </button>
        <button className="chip" role="tab" aria-selected="false">
          <LuClock size={14} /> Pengingat
        </button>
        <button className="chip" role="tab" aria-selected="false">
          <LuMessageCircle size={14} /> Chatbot
        </button>
        <button className="chip" role="tab" aria-selected="false">
          <LuUsers size={14} /> Family
        </button>
      </div>
    </section>
  )
}

export default LandingServiceChips

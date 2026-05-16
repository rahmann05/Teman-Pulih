import {
  LuScanLine,
  LuClock,
  LuMessageCircle,
  LuUsers,
  LuActivity
} from 'react-icons/lu';
import ServiceChip from '../../ui/landing/ServiceChip';

const SERVICES = [
  { id: 'all', label: 'Semua Layanan', icon: LuActivity, active: true },
  { id: 'ocr', label: 'OCR Resep', icon: LuScanLine, active: false },
  { id: 'reminder', label: 'Pengingat', icon: LuClock, active: false },
  { id: 'chatbot', label: 'Chatbot', icon: LuMessageCircle, active: false },
  { id: 'family', label: 'Family', icon: LuUsers, active: false },
];

const LandingServiceChips = () => {
  return (
    <section className="chips-section">
      <div className="chips-scroll" role="tablist" aria-label="Layanan">
        {SERVICES.map((service) => (
          <ServiceChip
            key={service.id}
            label={service.label}
            icon={service.icon}
            active={service.active}
            onClick={() => {}} // Handle chip selection logic if needed
          />
        ))}
      </div>

      {/* SVG Filter for Gooey Liquid Effect (Desktop Only) */}
      <svg style={{ visibility: 'hidden', position: 'absolute' }} width="0" height="0">
        <defs>
          <filter id="goo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </section>
  );
};

export default LandingServiceChips;

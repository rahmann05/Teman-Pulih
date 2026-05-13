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
    <section className="chips-section reveal">
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
    </section>
  );
};

export default LandingServiceChips;

/* src/components/ui/medication/DoseStatusIcon.jsx */
import { LuCircleCheck, LuCircleX, LuClock } from 'react-icons/lu';

const STATUS_META = {
  taken:   { icon: LuCircleCheck, label: 'Sudah diminum',  cls: 'taken' },
  missed:  { icon: LuCircleX,     label: 'Tidak diminum', cls: 'missed' },
  pending: { icon: LuClock,       label: 'Belum',          cls: 'pending' },
};

const DoseStatusIcon = ({ status = 'pending' }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;

  return (
    <>
      <span className={`med-dose-status-icon ${meta.cls}`} aria-hidden="true">
        <Icon size={16} />
      </span>
      <span className="med-dose-label">{meta.label}</span>
    </>
  );
};

export default DoseStatusIcon;

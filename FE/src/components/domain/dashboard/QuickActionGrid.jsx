import { LuScanLine, LuPill, LuMessageCircle, LuUsers } from 'react-icons/lu';
import scanImg   from '../../../assets/images/feature-ocr-scan-v2.png';
import medImg    from '../../../assets/images/feature-med-schedule-v2.png';
import chatImg   from '../../../assets/images/feature-ai-chatbot-v2.png';
import familyImg from '../../../assets/images/feature-family-sync.png';
import ActionTile from '../../ui/dashboard/ActionTile';

const ACTIONS = [
  {
    id:    'scan',
    label: 'Scan\nResep',
    icon:  LuScanLine,
    path:  '/scan',
    img:   scanImg,
    alt:   'Scan resep obat',
  },
  {
    id:    'meds',
    label: 'Jadwal\nObat',
    icon:  LuPill,
    path:  '/medications',
    img:   medImg,
    alt:   'Jadwal obat',
  },
  {
    id:    'chat',
    label: 'Chat AI',
    icon:  LuMessageCircle,
    path:  '/chatbot',
    img:   chatImg,
    alt:   'Chat AI medis',
  },
  {
    id:    'sync',
    label: 'Family\nSync',
    icon:  LuUsers,
    path:  '/family-sync',
    img:   familyImg,
    alt:   'Family sync',
  },
];

const QuickActionGrid = () => {
  return (
    <div className="dashboard-section">
      <div className="section-header">
        <h3 className="section-title">Layanan Cepat</h3>
      </div>
      <div className="quick-actions-grid" data-testid="quick-action-grid">
        {ACTIONS.map(({ id, label, icon, path, img, alt }) => (
          <ActionTile
            key={id}
            to={path}
            label={label}
            icon={icon}
            image={img}
            alt={alt}
          />
        ))}
      </div>
    </div>
  );
};

export default QuickActionGrid;

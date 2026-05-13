import { Link } from 'react-router-dom';
import { LuScanLine, LuPill, LuMessageCircle, LuUsers } from 'react-icons/lu';
import scanImg   from '../../../assets/images/feature-scan.png';
import medImg    from '../../../assets/images/feature-medication.png';
import chatImg   from '../../../assets/images/feature-chatbot.png';
import familyImg from '../../../assets/images/hero-recovery.png';

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
        {ACTIONS.map(({ id, label, icon: Icon, path, img, alt }) => (
          <Link key={id} to={path} className="action-card" aria-label={label.replace('\n', ' ')}>
            <img
              src={img}
              alt={alt}
              className="action-card-img"
              loading="lazy"
            />
            <div className="action-card-overlay" aria-hidden="true" />
            <div className="action-card-content">
              <Icon size={20} className="action-icon" aria-hidden="true" />
              <span className="action-label" style={{ whiteSpace: 'pre-line' }}>
                {label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActionGrid;

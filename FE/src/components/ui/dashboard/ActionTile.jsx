/* src/components/ui/dashboard/ActionTile.jsx */
import { Link } from 'react-router-dom';

const ActionTile = ({ to, label, icon: Icon, image, alt }) => {
  return (
    <Link to={to} className="action-card" aria-label={label.replace('\n', ' ')}>
      <img
        src={image}
        alt={alt}
        className="action-card-img"
        loading="lazy"
      />
      <div className="action-card-overlay" aria-hidden="true" />
      <div className="action-card-content">
        {Icon && <Icon size={20} className="action-icon" aria-hidden="true" />}
        <span className="action-label" style={{ whiteSpace: 'pre-line' }}>
          {label}
        </span>
      </div>
    </Link>
  );
};

export default ActionTile;

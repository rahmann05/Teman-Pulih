/* src/components/ui/dashboard/ActionTile.jsx */
import { Link } from 'react-router-dom';

const ActionTile = ({ to, label, icon: Icon, testId }) => {
  return (
    <Link to={to} className="action-tile" data-testid={testId}>
      <div className="action-icon-wrapper">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="action-tile-label">
        {/* Replace newlines with spaces or keep as is, but we want it flow cleanly */}
        {label.replace('\n', ' ')}
      </div>
    </Link>
  );
};

export default ActionTile;

/* src/components/ui/landing/StatCard.jsx */

const StatCard = ({ value, description, delayClass }) => {
  return (
    <div className={`stat reveal ${delayClass}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-desc">{description}</div>
    </div>
  );
};

export default StatCard;

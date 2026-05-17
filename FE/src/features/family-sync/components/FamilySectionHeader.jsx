const FamilySectionHeader = ({ title, count }) => (
  <div className="family-section-header">
    <h2 className="family-section-title">{title}</h2>
    {typeof count === 'number' && (
      <span className="family-section-count">{count}</span>
    )}
  </div>
);

export default FamilySectionHeader;

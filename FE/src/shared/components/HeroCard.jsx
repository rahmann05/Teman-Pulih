/* src/components/ui/HeroCard.jsx */

const HeroCard = ({ 
  backgroundImage, 
  overlay = true, 
  children, 
  className = '',
  testId
}) => {
  return (
    <div className={`hero-card ${className}`} data-testid={testId}>
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          className="hero-card-bg"
          aria-hidden="true"
          loading="eager"
        />
      )}
      {overlay && <div className="hero-card-overlay" />}
      <div className="hero-card-body">
        {children}
      </div>
    </div>
  );
};

export default HeroCard;

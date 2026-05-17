/* src/components/ui/landing/StepItem.jsx */

const StepItem = ({ number, title, text, delayClass }) => {
  return (
    <div className={`step reveal ${delayClass}`}>
      <div className="step-num">{number}</div>
      <h3 className="step-name">{title}</h3>
      <p className="step-text">{text}</p>
    </div>
  );
};

export default StepItem;

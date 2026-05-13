/* src/components/ui/layout/FooterColumn.jsx */

const FooterColumn = ({ title, links = [] }) => {
  return (
    <div className="footer-col">
      <h4 className="footer-title">{title}</h4>
      {links.map((link, index) => (
        <a key={index} href={link.href} className="footer-link">
          {link.label}
        </a>
      ))}
    </div>
  );
};

export default FooterColumn;

const fs = require('fs');
const file = 'g:/Capstone/temanpulih/FE/src/styles/features/Pelajari.css';
let css = fs.readFileSync(file, 'utf8');

// Hero
css = css.replace(/z-index: 10;\s+font-family: var\(--font-heading\);\s+font-size: var\(--text-display-giant\);\s+font-weight: 500;\s+line-height: 0\.92;\s+letter-spacing: -0\.04em;\s+color: var\(--text\);\s+text-align: center;\s+max-width: 90vw;\s+mix-blend-mode: multiply;/g, `z-index: 30;\n  font-family: var(--font-heading);\n  font-size: var(--text-display-giant);\n  font-weight: 500;\n  line-height: 0.92;\n  letter-spacing: -0.04em;\n  color: var(--text);\n  text-align: center;\n  max-width: 90vw;\n  text-shadow: 0 4px 40px rgba(255, 255, 255, 0.9), 0 0 100px rgba(255,255,255,0.5);`);

// Journey Track
css = css.replace(/align-items: flex-end;\n  gap: clamp\(40px, 6vw, 100px\);\n  padding: 0 30vw;\n  will-change: transform;/g, `align-items: flex-start;\n  gap: clamp(40px, 6vw, 100px);\n  padding: 0 30vw;\n  will-change: transform;\n  position: relative;\n  padding-top: 24px;`);
css = css.replace(/\.p-journey-item {\n  flex-shrink: 0;\n  width: clamp\(280px, 35vw, 520px\);\n  border-top: 2px solid var\(--accent\);\n  padding-top: var\(--space-6\);\n}/g, `.p-journey-track::before {\n  content: '';\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 2px;\n  background: var(--accent);\n}\n\n.p-journey-item {\n  flex-shrink: 0;\n  width: clamp(280px, 35vw, 520px);\n}`);

// Feature Overlay
css = css.replace(/rgba\(26,26,46,0\.92\) 0%,\n    rgba\(26,26,46,0\.55\) 50%,\n    rgba\(26,26,46,0\.15\) 100%/g, `rgba(61,92,77,0.98) 0%,\n    rgba(61,92,77,0.75) 50%,\n    rgba(61,92,77,0.2) 100%`);
css = css.replace(/\.p-feature-content {\n  position: relative;\n  z-index: 10;\n  max-width: 760px;\n}/g, `.p-feature-content {\n  position: relative;\n  z-index: 10;\n  max-width: 760px;\n  padding-top: 80px;\n}`);

// Pillars Section
css = css.replace(/\.p-pillars-section {\n  background: var\(--bg-dark\);\n  padding: var\(--space-editorial-y\) var\(--space-editorial-x\);\n  color: var\(--text-inverse\);\n}/g, `.p-pillars-section {\n  background: var(--sage);\n  padding: var(--space-editorial-y) var(--space-editorial-x);\n  color: #FFFFFF;\n}`);
css = css.replace(/\.p-pillar-title {\n  font-family: var\(--font-heading\);\n  font-size: var\(--text-2xl\);\n  font-weight: 700;\n  line-height: 1\.2;\n}/g, `.p-pillar-title {\n  font-family: var(--font-heading);\n  font-size: var(--text-2xl);\n  font-weight: 700;\n  line-height: 1.2;\n  color: #FFFFFF;\n}`);
css = css.replace(/color: rgba\(255,255,255,0\.65\);/g, `color: rgba(255,255,255,0.85);`);

// Gallery Section
css = css.replace(/\.p-gallery-section {\n  background: var\(--bg\);\n  padding: var\(--space-editorial-y\) var\(--space-editorial-x\);\n}/g, `.p-gallery-section {\n  background: var(--bg);\n  padding: calc(var(--space-editorial-y) + 40px) var(--space-editorial-x) var(--space-editorial-y);\n}`);

// Team Card
css = css.replace(/object-position: center top;/g, `object-position: center; z-index: 1;`);
css = css.replace(/background: linear-gradient\(to top, rgba\(0,0,0,0\.7\) 0%, transparent 60%\);/g, `background: linear-gradient(to top, rgba(61,92,77,0.95) 0%, transparent 70%); z-index: 2;`);
css = css.replace(/\.p-team-card-info {\n  position: relative;\n  z-index: 10;\n  padding: 0 var\(--space-editorial-x\) clamp\(40px, 8vh, 80px\);\n  color: #fff;\n  drop-shadow: 0 4px 24px rgba\(0,0,0,0\.5\);\n}/g, `.p-team-card-info {\n  position: relative;\n  z-index: 10;\n  padding: 0 var(--space-editorial-x) clamp(40px, 8vh, 80px);\n  color: #fff;\n  drop-shadow: 0 4px 24px rgba(0,0,0,0.8);\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n}`);

// Footer
css = css.replace(/\.p-mega-footer {\n  background: var\(--sage-light\);\n  color: var\(--sage-dark\);\n  padding: var\(--space-editorial-y\) var\(--space-editorial-x\) 48px;\n  position: relative;\n  overflow: hidden;\n}/g, `.p-mega-footer {\n  background: var(--bg);\n  color: var(--text);\n  padding: var(--space-editorial-y) var(--space-editorial-x) 100px;\n  position: relative;\n  overflow: hidden;\n}`);

css = css.replace(/color: var\(--sage-dark\);/g, `color: var(--sage);`);
css = css.replace(/background: var\(--sage-dark\);/g, `background: var(--sage);`);

// Fix specifically the footer link text
css = css.replace(/color: var\(--sage\);\s+text-decoration: none;\s+position: relative;\s+display: inline-block;\n}/g, `color: var(--text);\n  text-decoration: none;\n  position: relative;\n  display: inline-block;\n}`);
css = css.replace(/background: var\(--sage\);\s+transform: scaleX\(0\);/g, `background: var(--text);\n  transform: scaleX(0);`);

// Append Feature btn
const btnCSS = `\n/* Add this to the end of Pelajari.css to style the feature button */\n.p-feature-btn {\n  display: inline-block;\n  padding: 16px 32px;\n  background: rgba(255, 255, 255, 0.1);\n  color: #FFFFFF !important;\n  border: 1px solid rgba(255, 255, 255, 0.4);\n  border-radius: var(--radius-full);\n  font-family: var(--font-heading);\n  font-weight: 700;\n  font-size: var(--text-base);\n  text-decoration: none;\n  backdrop-filter: blur(8px);\n  -webkit-backdrop-filter: blur(8px);\n  transition: background 0.3s ease, border-color 0.3s ease;\n  cursor: pointer;\n}\n.p-feature-btn:hover {\n  background: rgba(255, 255, 255, 0.2);\n  border-color: #FFFFFF;\n}\n`;

if(!css.includes('.p-feature-btn')) {
    css += btnCSS;
}

fs.writeFileSync(file, css);
console.log('CSS updated successfully');

import { motion } from 'framer-motion';

import imgAbu from '../../../assets/images/developer/Abu Harris.png';
import imgSafdar from '../../../assets/images/developer/Safdar Rahman.png';
import imgRuli from '../../../assets/images/developer/Ruli Hardimulya.png';
import bgDev from '../../../assets/images/developer/dev-bg.png';

const imgMirza = `https://ui-avatars.com/api/?name=Mirza&background=random&color=fff&size=512`;
const imgIkhsan = `https://ui-avatars.com/api/?name=M+Ikhsan&background=random&color=fff&size=512`;

const team = [
  { id: 1, name: 'Abu Harris Muhyidin', role: 'Backend Developer', img: imgAbu },
  { id: 2, name: 'Safdar Rahman',       role: 'Frontend Developer', img: imgSafdar },
  { id: 3, name: 'Mirza',               role: 'AI Engineer',       img: imgMirza },
  { id: 4, name: 'M. Ikhsan',           role: 'Data Scientist',    img: imgIkhsan },
  { id: 5, name: 'Ruli Hardi mulya',    role: 'Data Scientist',    img: imgRuli },
];

const PelajariTeam = () => (
  <section className="p-team-sus" data-theme="dark">
    <div className="p-team-sus-header">
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
      >
        Para arsitek di balik ekosistem TemanPulih.
      </motion.h2>
    </div>

    <div className="p-team-sus-grid p-team-sus-dev-grid">
      {team.map((m, i) => (
        <motion.div
          key={m.id}
          className="p-team-sus-card"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 1, delay: i * 0.1, ease: [0.16,1,0.3,1] }}
        >
          <div className="p-team-sus-img-wrapper" style={{ backgroundImage: `url(${bgDev})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <img src={m.img} alt={m.name} className="dev-portrait" />
          </div>
          <div className="p-team-sus-info">
            <h3 className="p-team-sus-name">{m.name}</h3>
            <p className="p-team-sus-role">{m.role}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default PelajariTeam;

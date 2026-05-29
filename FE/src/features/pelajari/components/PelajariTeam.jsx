import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import imgAbu from '@/assets/images/Developer/Abu Harris.webp';
import imgSafdar from '@/assets/images/Developer/Rahman.webp';
import imgRuli from '@/assets/images/Developer/Ruli Hardimulya.webp';
import imgMirza from '@/assets/images/Developer/Mirza.webp';
import imgIkhsan from '@/assets/images/Developer/Ikhsan.webp';

const team = [
  { id: 1, name: 'Abu Harris Muhyidin', role: 'Backend Developer', img: imgAbu, aboutIndex: 0 },
  { id: 2, name: 'Safdar Rahman',       role: 'Frontend Developer', img: imgSafdar, aboutIndex: 1 },
  { id: 3, name: 'Mirza',               role: 'AI Engineer',       img: imgMirza, aboutIndex: 2 },
  { id: 4, name: 'M. Ikhsan',           role: 'Data Scientist',    img: imgIkhsan, aboutIndex: 4 },
  { id: 5, name: 'Ruli Hardi mulya',    role: 'Data Scientist',    img: imgRuli, aboutIndex: 3 },
];

const PelajariTeam = () => {
  const navigate = useNavigate();

  return (
    <section className="p-team-sus" data-theme="dark">
      <div className="p-team-sus-header">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
        >
          Pengembang di balik TemanPulih.
        </motion.h2>
      </div>

      <div className="p-team-sus-grid p-team-sus-dev-grid">
        {team.map((m, i) => (
          <motion.div
            key={m.id}
            className="p-team-sus-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/about', { state: { activeIndex: m.aboutIndex } })}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="p-team-sus-img-wrapper">
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
};

export default PelajariTeam;

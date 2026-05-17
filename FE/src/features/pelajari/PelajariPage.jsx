import PelajariNavbar          from './components/PelajariNavbar';
import PelajariHero             from './components/PelajariHero';
import PelajariJourney          from './components/PelajariJourney';
import PelajariFeaturesSlider   from './components/PelajariFeaturesSlider';
import PelajariPillars          from './components/PelajariPillars';
import PelajariGallery          from './components/PelajariGallery';
import PelajariTeam             from './components/PelajariTeam';
import PelajariCTA              from './components/PelajariCTA';
import '../../styles/features/Pelajari.css';

const PelajariPage = () => (
  <div className="pelajari-page">
    <PelajariNavbar />
    <main>
      <PelajariHero />
      <PelajariJourney />
      <PelajariFeaturesSlider />
      <PelajariPillars />
      <PelajariGallery />
      <PelajariTeam />
      <PelajariCTA />
    </main>
  </div>
);

export default PelajariPage;

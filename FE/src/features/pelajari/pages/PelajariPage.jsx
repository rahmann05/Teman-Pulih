import PelajariNavbar          from '@/features/pelajari/components/PelajariNavbar';
import PelajariHero             from '@/features/pelajari/components/PelajariHero';
import PelajariJourney          from '@/features/pelajari/components/PelajariJourney';
import PelajariFeaturesSlider   from '@/features/pelajari/components/PelajariFeaturesSlider';
import PelajariPillars          from '@/features/pelajari/components/PelajariPillars';
import PelajariGallery          from '@/features/pelajari/components/PelajariGallery';
import PelajariTeam             from '@/features/pelajari/components/PelajariTeam';
import PelajariCTA              from '@/features/pelajari/components/PelajariCTA';
import '@/features/pelajari/pelajari.css';

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

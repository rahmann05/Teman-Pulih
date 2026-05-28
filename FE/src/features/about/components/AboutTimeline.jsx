import React, { useState } from 'react';
import { LuCheck } from 'react-icons/lu';

const AboutTimeline = ({ teamMembers, teamRoadmaps }) => {
  const [timelineIndex, setTimelineIndex] = useState(0);

  return (
    <section className="a-timeline-section">
      <div className="a-timeline-header">
        <h2 className="a-timeline-title">Apa yang Kami Bangun</h2>
        <p className="a-timeline-desc">
          Mulai dari menyusun logika database, melatih asisten AI, hingga merajut tampilan antarmuka yang ramah. Berikut adalah rincian dari pekerjaan nyata yang masing-masing dari kami lakukan di balik layar.
        </p>
      </div>

      {/* Tab Selector grouping by professional teams with avatar overlap groups */}
      <div className="a-timeline-selector">
        {teamRoadmaps.map((roadmap, idx) => {
          return (
            <button
              key={roadmap.id}
              className={`a-selector-btn ${timelineIndex === idx ? 'is-active' : ''}`}
              onClick={() => setTimelineIndex(idx)}
            >
              <span>{roadmap.title}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Timeline roadmap based on selected team path */}
      <div className="a-roadmap-container">
        <div className="a-roadmap-line" />

        {teamRoadmaps[timelineIndex].milestones.map((milestone, mIdx) => {
          const milestoneMembers = teamMembers.filter(m => milestone.members.includes(m.id));

          return (
            <div key={mIdx} className="a-roadmap-step">
              <div className="a-roadmap-dot" />

              <div className="a-roadmap-step-header">
                <h4 className="a-roadmap-milestone-title">{milestone.title}</h4>
              </div>

              <div className="a-roadmap-cards-grid">
                {/* Single Realized Feature Smart Card */}
                <div className="a-roadmap-smart-card single-feature-card">
                  <div className="a-roadmap-tag done">
                    <LuCheck size={12} /> pencapaian fitur & kontribusi
                  </div>
                  <p className="a-roadmap-card-text">{milestone.desc}</p>
                  
                  {/* Framer-style Floating Hover Card Popup (Image layout) */}
                  <div className="a-roadmap-hover-card">
                    <div className="a-hover-header-imgs">
                      {milestoneMembers.map(m => (
                        <img key={m.id} src={m.img} alt={m.name} className={`a-hover-top-img a-hover-member-img-${m.id}`} />
                      ))}
                    </div>
                    <div className="a-hover-card-body">
                      <h5 className="a-hover-card-title">{milestone.title}</h5>
                      <span className="a-hover-card-subtitle">
                        {milestoneMembers.map(m => m.name.split(' ')[0]).join(' & ')} • {milestone.date}
                      </span>

                      <div className="a-hover-tech-tags">
                        {milestone.tags.map((tag, i) => (
                          <span key={i} className="a-hover-tech-tag">{tag}</span>
                        ))}
                      </div>

                      <p className="a-hover-card-desc">{milestone.desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AboutTimeline;

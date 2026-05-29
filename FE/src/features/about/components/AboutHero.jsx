import React from 'react';
import { HiOutlineArrowRight } from 'react-icons/hi2';

const AboutHero = () => {
  return (
    <section className="a-hero">
      <div className="a-hero-container">
        <p className="a-hero-eyebrow">Pengembang TemanPulih · Proyek Capstone CC26-PSU347</p>
        <h1 className="a-hero-title">
          orang-orang di balik<br />
          temanpulih.
        </h1>
        <p className="a-hero-desc">
          TemanPulih dibangun oleh tim kecil dengan tiga fokus utama: mengolah data medis, meracik kecerdasan buatan, dan merancang pengalaman web yang nyaman. Semuanya dikerjakan bersama dengan satu tujuan tulus—memastikan pasien tidak lagi merasa kebingungan saat masa pemulihan di rumah.
        </p>
        <div style={{ marginTop: '2rem' }}>
          <a 
            href="https://dashboard-capstone-temanpulih.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-primary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            Lihat Dashboard Analitik <HiOutlineArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default AboutHero;

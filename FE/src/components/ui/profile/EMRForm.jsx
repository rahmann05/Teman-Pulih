import React from 'react';

const EMRForm = ({ formData, handleChange, handleSubmit, loading }) => {
  return (
    <form onSubmit={handleSubmit} className="emr-form">
      <div className="emr-form-grid">
        
        {/* KOLOM KIRI: Data Fisik & Kebiasaan */}
        <div className="emr-form-col">
          <div className="form-group">
            <label>Golongan Darah</label>
            <select name="blood_type" value={formData.blood_type} onChange={handleChange}>
              <option value="">Pilih Golongan Darah</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="O">O</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tinggi (cm)</label>
              <input type="number" name="height" value={formData.height} onChange={handleChange} min="50" max="250" placeholder="Misal: 170" />
            </div>
            <div className="form-group">
              <label>Berat (kg)</label>
              <input type="number" name="weight" value={formData.weight} onChange={handleChange} min="10" max="300" placeholder="Misal: 65" />
            </div>
          </div>
          <div className="form-group">
            <label>Tensi Darah Rata-rata (Opsional)</label>
            <select name="blood_pressure_range" value={formData.blood_pressure_range} onChange={handleChange}>
              <option value="">Pilih (Jika Tahu)</option>
              <option value="Rendah (<90/60)">Rendah (&lt;90/60)</option>
              <option value="Normal (120/80)">Normal (120/80)</option>
              <option value="Tinggi (>140/90)">Tinggi (&gt;140/90)</option>
            </select>
          </div>

          <div className="form-group checkbox-group" style={{ marginTop: '1rem' }}>
            <label className="checkbox-label">
              <input type="checkbox" name="smoking_habit" checked={formData.smoking_habit} onChange={handleChange} />
              <span>Memiliki kebiasaan merokok</span>
            </label>
          </div>
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="alcohol_habit" checked={formData.alcohol_habit} onChange={handleChange} />
              <span>Mengonsumsi alkohol secara rutin</span>
            </label>
          </div>
        </div>

        {/* KOLOM KANAN: Riwayat Medis */}
        <div className="emr-form-col">
          <div className="form-group">
            <label>Riwayat Alergi</label>
            <textarea name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Misal: Seafood, Udang, Obat Paracetamol (Kosongkan jika tidak ada)" rows="2"></textarea>
          </div>
          <div className="form-group">
            <label>Penyakit Kronis / Bawaan</label>
            <textarea name="chronic_conditions" value={formData.chronic_conditions} onChange={handleChange} placeholder="Misal: Asma, Hipertensi, Diabetes, Asam Lambung (Kosongkan jika tidak ada)" rows="2"></textarea>
          </div>
          <div className="form-group">
            <label>Penyakit yang Pernah Diderita (Umum)</label>
            <textarea name="past_illnesses" value={formData.past_illnesses} onChange={handleChange} placeholder="Misal: Tipes (Tifus), Demam Berdarah (DBD), Cacar Air" rows="2"></textarea>
          </div>
          <div className="form-group">
            <label>Penyakit yang Terakhir Diderita</label>
            <input type="text" name="last_illness" value={formData.last_illness} onChange={handleChange} placeholder="Misal: Flu berat minggu lalu, Radang tenggorokan" />
          </div>
          <div className="form-group">
            <label>Riwayat Operasi</label>
            <input type="text" name="surgeries_history" value={formData.surgeries_history} onChange={handleChange} placeholder="Misal: Operasi Usus Buntu (2020) (Kosongkan jika tidak ada)" />
          </div>
          <div className="form-group">
            <label>Obat yang Sedang Rutin Dikonsumsi</label>
            <input type="text" name="routine_medications" value={formData.routine_medications} onChange={handleChange} placeholder="Misal: Metformin, Amlodipine (Kosongkan jika tidak ada)" />
          </div>
        </div>
      </div>
      
      {/* KONTAK DARURAT (Bawah) */}
      <div className="emr-form-section" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <div className="form-group">
          <label>Kontak Darurat (Opsional)</label>
          <div className="form-row">
            <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} placeholder="Nama Keluarga / Kerabat" />
            <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} placeholder="Nomor Telepon Darurat" />
          </div>
        </div>
      </div>
      
      <div className="emr-form-actions">
         <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
           {loading ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
         </button>
      </div>
    </form>
  );
};

export default EMRForm;

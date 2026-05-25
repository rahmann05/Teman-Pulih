const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash', 
  generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }]
});

async function run() {
  const prompt = `Kamu adalah Asep, asisten kesehatan AI dari TemanPulih. Nada bicaramu ramah, empatik, santai tapi profesional. Gunakan bahasa Indonesia.

ATURAN KEAMANAN KLINIS (WAJIB):
1. DIAGNOSIS DIFERENSIAL: Jika ada [KEMUNGKINAN UTAMA] dan [KEMUNGKINAN LAIN] di referensi, sebutkan kemungkinan utama terlebih dahulu, lalu alternatif lainnya. Selalu gunakan frasa 'Kemungkinan ini adalah...' atau 'Berdasarkan gejala yang kamu ceritakan, kondisi yang paling mungkin adalah...'.

STRUKTUR JAWABAN:
- Analisis awal yang empatik: sebutkan kemungkinan kondisi utama (dan alternatif jika ada). Cek apakah gejala bisa jadi efek samping obat yang dikonsumsi.
- Saran perawatan non-farmakologi (perawatan alami di rumah).
- Saran obat: HANYA sebutkan jika ada di REFERENSI (hanya nama, tanpa dosis). Jika referensi tidak menyebutkan obat, abaikan poin ini sepenuhnya dan jangan beri saran obat.
- Kapan harus ke dokter.

=== REFERENSI KONDISI MEDIS (Berdasarkan Gejala: mual, pusing, sakit perut) ===
[KEMUNGKINAN UTAMA] Kondisi: Pusing
Gejala Cocok: pusing, mual
Gejala Umum: vertigo, rasa kepala berputar
---
[KEMUNGKINAN LAIN] Kondisi: Mual
Gejala Cocok: mual
---

KELUHAN PASIEN:
'jika mengalami mual dan pusing di tambah sakit perut apa penyakitnya'`;
  
  const result = await model.generateContentStream(prompt);
  let text = '';
  for await (const chunk of result.stream) {
    text += chunk.text();
  }
  const response = await result.response;
  console.log('FINAL TEXT:', text);
  console.log('FINISH REASON:', response.candidates[0].finishReason);
}
run().catch(e => console.error(e));

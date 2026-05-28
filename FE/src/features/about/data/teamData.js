import imgAbu from '@/assets/images/developer/Abu Harris.webp';
import imgSafdar from '@/assets/images/developer/Rahman.webp';
import imgRuli from '@/assets/images/developer/Ruli Hardimulya.webp';
import imgMirza from '@/assets/images/developer/Mirza.webp';
import imgIkhsan from '@/assets/images/developer/Ikhsan.webp';

export const teamMembers = [
  {
    id: 1,
    name: 'Abu Harris Muhyidin',
    role: 'Backend Developer',
    path: 'Full Stack Web Developer',
    img: imgAbu,
    color: 'var(--sage-dark)',
    bio: 'Menjembatani logika database relasional Express.js dan integrasi model AI asinkron di backend.',
    quote: 'Buatku, backend itu ibarat pondasi rumah. Kalau databasenya dirancang rapi dan kuat, data riwayat medis pasien pasti jauh lebih aman dan sistemnya bisa diandalkan.',
    techStack: ['Node.js', 'Express.js', 'PostgreSQL', 'JWT Auth', 'FastAPI', 'Sequelize ORM', 'SQL'],
    github: 'https://github.com/harris-muhyidin',
    linkedin: 'https://www.linkedin.com/in/abu-harris-muhyidin-727a16151?utm_source=share_via&utm_content=profile&utm_medium=member_android',
    milestones: [
      {
        title: '1. Perancangan RESTful API',
        plan: 'Menyediakan struktur endpoint konvensi RESTful untuk kelancaran komunikasi backend-frontend.',
        done: 'Membangun API modular berkinerja tinggi berbasis Express.js & Node.js yang modular dan bersih.'
      },
      {
        title: '2. Manajemen Basis Data',
        plan: 'Menyimpan data resep obat dan riwayat medis pasien secara terstruktur menggunakan database.',
        done: 'Merancang PostgreSQL dengan relasi tabel profil pasien, caregiver, pengingat, log aktivitas, dan chatbot.'
      },
      {
        title: '3. Keamanan Akses & Autentikasi',
        plan: 'Mengimplementasikan sistem keamanan autentikasi token JWT untuk mengamankan data rahasia pengguna.',
        done: 'Middleware verifikasi JWT yang tangguh di sisi backend dengan penanganan cookie / token header terenkripsi.'
      },
      {
        title: '4. Integrasi Microservice AI',
        plan: 'Menghubungkan network call Express backend dengan model kecerdasan buatan AI/ML.',
        done: 'Integrasi FastAPI Python asinkron untuk melayani request Deep OCR & MedGemma RAG secara real-time.'
      }
    ]
  },
  {
    id: 2,
    name: 'Safdar Rahman Syam',
    role: 'Frontend Developer',
    path: 'Full Stack Web Developer',
    img: imgSafdar,
    color: 'var(--accent)',
    bio: 'Merancang estetika hangat TemanPulih menjadi antarmuka responsif yang hidup dengan transisi interaktif.',
    quote: 'Aku percaya desain yang bagus itu desain yang nggak bikin pusing. Harapanku, antarmuka TemanPulih bisa bikin pasien ngerasa lebih tenang dan gampang pas nyari info.',
    techStack: ['React 19', 'Vite', 'Vanilla CSS', 'Framer Motion', 'Axios Client', 'Context API', 'Theme Switch'],
    github: 'https://github.com/safdar-rahman',
    linkedin: 'https://www.linkedin.com/in/safdar-rahman',
    milestones: [
      {
        title: '1. Visual Mockup & Layouting',
        plan: 'Merancang rancangan mockup antarmuka di Figma dan mengimplementasikan seluruh halaman UI web.',
        done: 'Realisasi visual responsif premium (Tri-Layout) untuk Landing Page, Dashboard, Scan, & Chatbot UI.'
      },
      {
        title: '2. State Management & Tema',
        plan: 'Mengelola global state management untuk sinkronisasi sesi pengguna dan perpindahan tema.',
        done: 'Context API global untuk perpindahan tema dinamis (Patient Cream vs Caregiver Sage) secara instan real-time.'
      },
      {
        title: '3. Scanner & Crop Resep Medis',
        plan: 'Mengintegrasikan antarmuka OCR yang interaktif langsung pada browser untuk proses input obat.',
        done: 'Komponen visual crop area resep medis, live manual correction modal, dan dynamic loading shimmers.'
      },
      {
        title: '4. Protected Routing & API Integration',
        plan: 'Membangun komponen web interaktif menggunakan React dengan Axios & rute akses terproteksi.',
        done: 'Implementasi protected routes client, proteksi admin/role, dan integrasi request asinkron Axios.'
      }
    ]
  },
  {
    id: 3,
    name: 'Muhammad Mirza Faiz Rabbani',
    role: 'AI Engineer',
    path: 'AI Engineering',
    img: imgMirza,
    color: 'var(--accent-dark)',
    bio: 'Membangun Artificial Intelligence untuk TemanPulih. Mengintegrasikan Gemini Vision OCR, arsitektur RAG Chatbot, dan pemodelan Shallow Deep Learning MLP untuk analisis kepatuhan.',
    quote: 'AI di sini dirancang bukan buat ngegantiin peran dokter, tapi sebagai asisten pinter yang standby bantu ngejelasin resep obat biar pasien nggak kebingungan di rumah.',
    techStack: ['Shallow Deep Learning', 'MLP Model', 'Gemini API', 'RAG Pipeline', 'ChromaDB', 'LLM Agents'],
    github: 'https://github.com/mirza-faiz',
    linkedin: 'https://www.linkedin.com/in/mirza-faiz-79640b247?utm_source=share_via&utm_content=profile&utm_medium=member_android',
    milestones: [
      {
        title: '1. Model Vision OCR',
        plan: 'Membangun arsitektur model Deep Learning kustom untuk mendeteksi teks etiket resep medis.',
        done: 'Integrasi Gemini Vision Pro API untuk ekstraksi data resep obat secara presisi tinggi.'
      },
      {
        title: '2. Pipeline Ekstraksi Entitas',
        plan: 'Menyediakan endpoint komunikasi model AI via network call agar dapat dikonsumsi backend.',
        done: 'Membangun pipeline Gatekeeper & System Prompt khusus ekstraksi medis.'
      },
      {
        title: '3. Model Edukasi Resep Generatif',
        plan: 'Mengelola integrasi tambahan menggunakan layanan Generative AI untuk chatbot konsultasi resep.',
        done: 'Implementasi asisten Chatbot Asep berbasis LLM dan Retrieval-Augmented Generation.'
      },
      {
        title: '4. Pipeline RAG & Vektor DB',
        plan: 'Mengintegrasikan asisten pencarian semantik untuk memperkuat basis keilmuan resep medis.',
        done: 'Integrasi ChromaDB sebagai vector database lokal untuk pencarian semantik konteks.'
      }
    ]
  },
  {
    id: 4,
    name: 'Ruli Hardimulya',
    role: 'Data Scientist',
    path: 'Data Science',
    img: imgRuli,
    color: 'var(--sage)',
    bio: 'Mengekstrak insight analitik dari data obat-obatan komersial dan pembuat model fuzzy matching untuk akurasi data resep.',
    quote: 'Dari data kita bisa belajar banyak hal. Tugasku mastiin data resep obat itu bener-bener akurat, jadi typo sekecil apapun dari AI bisa langsung dikoreksi otomatis.',
    techStack: ['Python', 'Pandas & Numpy', 'Fuzzy Matching', 'Levenshtein Distance', 'Exploratory Analysis', 'Streamlit Dashboard'],
    github: 'https://github.com/ruli-hardi',
    linkedin: 'https://linkedin.com/in/ruli-hardimulya',
    milestones: [
      {
        title: '1. Analisis Masalah Bisnis',
        plan: 'Menganalisis berbagai permasalahan bisnis medis untuk menentukan satu solusi utama yang akan dikembangkan.',
        done: 'Mengidentifikasi risiko pembacaan resep yang keliru (30-50% salah kepatuhan) sebagai pemicu readmission rate.'
      },
      {
        title: '2. Data Wrangling & Cleaning',
        plan: 'Melakukan proses data wrangling secara komprehensif (Gathering, Assessing, Cleaning) dataset resep obat.',
        done: 'Pengumpulan dataset resep obat komersial beredar di Indonesia dan pembersihan data noise.'
      },
      {
        title: '3. Algoritma Koreksi Data OCR',
        plan: 'Feature engineering lanjutan tingkat lanjut untuk mengolah data teks masukan mentah.',
        done: 'Membangun logika fuzzy matching berbasis Levenshtein Distance untuk mengoreksi typo pembacaan OCR obat.'
      },
      {
        title: '4. Visualisasi & Analitik Laporan',
        plan: 'Membuat visualisasi data analitik dan dashboard interaktif menggunakan Streamlit.',
        done: 'Dashboard monitoring statistik pola kepatuhan, visualisasi kepatuhan bulanan, dan laporan rekam medis.'
      }
    ]
  },
  {
    id: 5,
    name: 'Mochammad Ikhsan',
    role: 'Data Scientist',
    path: 'Data Science',
    img: imgIkhsan,
    color: 'var(--copper)',
    bio: 'Merancang skema pemodelan statistik dan penyusun Data Dictionary untuk data kepatuhan obat.',
    quote: 'Bikin fitur nggak bisa cuma modal feeling. Lewat uji statistik dan eksperimen, kita bisa buktiin kalau apa yang kita bangun beneran ngebantu orang lebih rajin minum obat.',
    techStack: ['A/B Testing', 'Statistical Modeling', 'Python Data Science', 'Data Dictionary', 'EDA', 'Quantitative Analysis'],
    github: 'https://github.com/m-ikhsan',
    linkedin: 'https://linkedin.com/in/mochammad-ikhsan',
    milestones: [
      {
        title: '1. Visualisasi Statistik Kepatuhan',
        plan: 'Berkolaborasi dalam data gathering, Exploratory Data Analysis, dan visualisasi dashboard.',
        done: 'Menyusun visualisasi analitik statistik korelasi tingkat kepatuhan minum obat di backend.'
      },
      {
        title: '2. Data Dictionary & Kamus Data',
        plan: 'Menulis dokumentasi Data Dictionary agar setiap atribut basis data terdefinisi terstruktur.',
        done: 'Dokumentasi komprehensif skema variabel database obat komersial Indonesia yang valid.'
      },
      {
        title: '3. Validasi Eksperimen A/B Testing',
        plan: 'Mengimplementasikan pengujian A/B Testing statistik menggunakan Python untuk menguji hipotesis fitur.',
        done: 'Merancang A/B Testing statistik untuk keefektifan sistem pengingat sinkronisasi otomatis Family Sync.'
      },
      {
        title: '4. Laporan Performa Model',
        plan: 'Berkolaborasi menyusun evaluasi model analitik dan pembuatan laporan teknis akhir proyek.',
        done: 'Dokumentasi performa akhir model tingkat kepatuhan obat dan pelaporan proyek.'
      }
    ]
  }
];

export const teamRoadmaps = [
  {
    id: 'fullstack',
    title: 'Fullstack Team',
    role: 'Full Stack Web Development',
    milestones: [
      {
        title: 'RESTful API & Integrasi Database (PostgreSQL)',
        date: 'Infrastruktur Backend',
        tags: ['Express.js', 'PostgreSQL', 'Node.js', 'Sequelize ORM'],
        desc: 'Membangun server backend utama modular berbasis Express.js, serta merancang skema database relasional PostgreSQL komprehensif untuk data pasien, log kepatuhan obat, dan relasi caregiver.',
        members: [1] // Abu
      },
      {
        title: 'Sistem Autentikasi JWT & Keamanan API',
        date: 'Keamanan Data',
        tags: ['JWT Auth', 'Bcrypt', 'API Security'],
        desc: 'Mengamankan seluruh endpoint backend menggunakan otorisasi token JWT, enkripsi kata sandi dengan Bcrypt, serta proteksi lapisan middleware agar data rekam medis pasien terjamin kerahasiaannya.',
        members: [1] // Abu
      },
      {
        title: 'Infrastruktur Cloud Storage & Integrasi AI',
        date: 'Infrastruktur Cloud',
        tags: ['Supabase Storage', 'FastAPI Proxy', 'Microservices'],
        desc: 'Mengintegrasikan Supabase Storage Bucket untuk penyimpanan aman foto unggahan resep pasien, serta menjembatani network call API ke microservice AI Python FastAPI secara asinkron.',
        members: [1] // Abu
      },
      {
        title: 'Desain Antarmuka Web Editorial & Desain Sistem',
        date: 'Desain Visual & Layanan UI',
        tags: ['React 19', 'Vanilla CSS', 'Framer Motion', 'Micro-Interactions'],
        desc: 'Merancang dan memprogram sistem visual web responsif adaptif dari nol dengan estetika hangat yang menenangkan, mengintegrasikan transisi halaman berkelas tinggi, serta memastikan kegunaan UI yang mulus di perangkat mobile dan desktop.',
        members: [2] // Safdar
      },
      {
        title: 'Arsitektur Frontend, State Global & Sistem Otentikasi',
        date: 'Arsitektur & Logika Inti',
        tags: ['Context API', 'Axios Interceptors', 'React Router', 'Protected Routes'],
        desc: 'Membangun Context API global untuk manajemen state autentikasi pengguna, menerapkan rute terproteksi (Protected Routes) untuk keamanan rekam medis, menyusun mekanisme perpindahan tema dinamis (Patient vs Caregiver), dan mengonfigurasi interseptor Axios client API.',
        members: [2] // Safdar
      },
      {
        title: 'Integrasi API, Pemrosesan Foto Resep & Chatbot AI Real-time',
        date: 'Logika & Integrasi Fitur',
        tags: ['Image Cropper', 'AI Streaming', 'Compliance Tracker', 'Family-Sync'],
        desc: 'Merealisasikan modul pemotongan foto resep obat interaktif (crop canvas), menghubungkan data hasil pindai OCR ke form manual, mengintegrasikan alur asisten medis Chatbot Asep dengan efek text streaming real-time, serta membangun tracker jadwal kepatuhan obat dan sistem sinkronisasi pengawasan keluarga (Family-Sync).',
        members: [2] // Safdar
      }
    ]
  },
  {
    id: 'datascience',
    title: 'Data Science Team',
    role: 'Data Science & Analytics',
    milestones: [
      {
        title: 'Pengumpulan & Penyaringan Kamus Obat',
        date: 'Data Wrangling',
        tags: ['Data Gathering', 'Pandas', 'Data Cleaning'],
        desc: 'Mengumpulkan, menyaring, dan membersihkan ribuan data obat-obatan komersial di Indonesia agar menjadi basis referensi database yang bersih dan siap pakai.',
        members: [5] // Ikhsan
      },
      {
        title: 'Analisis Pola Perilaku Kelalaian Obat (EDA)',
        date: 'Data Wrangling',
        tags: ['EDA', 'Statistics', 'Risk Mapping'],
        desc: 'Melakukan analisis eksploratif untuk memetakan korelasi faktor-faktor kelalaian pasien minum obat terhadap tingkat rawat inap ulang (readmission rate).',
        members: [5] // Ikhsan
      },
      {
        title: 'Model Fuzzy Matching Koreksi OCR',
        date: 'Feature Engineering',
        tags: ['Fuzzy Matching', 'Levenshtein', 'Python'],
        desc: 'Membangun algoritma Levenshtein Distance untuk mendeteksi kesamaan string obat dan otomatis mengoreksi kesalahan ketik hasil pindaian resep AI.',
        members: [4] // Ruli
      },
      {
        title: 'Feature Engineering Data Kepatuhan',
        date: 'Feature Engineering',
        tags: ['Preprocessing', 'Imputation', 'Oversampling'],
        desc: 'Melakukan penanganan data pencilan, imputasi nilai kosong, rekayasa fitur tingkat kesulitan obat, dan oversampling data untuk kebutuhan pemodelan AI.',
        members: [4] // Ruli
      }
    ]
  },
  {
    id: 'ai',
    title: 'AI Engineer Team',
    role: 'AI Engineering & LLM',
    milestones: [
      {
        title: 'Pindai Resep Otomatis dengan Vision AI',
        date: 'Fitur Visi',
        tags: ['Gemini Vision API', 'Image Processing', 'FastAPI'],
        desc: 'Memanfaatkan teknologi Google Gemini Vision Pro untuk mengenali dan mengekstrak huruf dari foto label resep obat dengan cepat dan menghemat waktu pasien.',
        members: [3] // Mirza
      },
      {
        title: 'Model Prediksi Kepatuhan Minum Obat (MLP)',
        date: 'Pemodelan AI',
        tags: ['Shallow Deep Learning', 'MLP', 'TensorFlow'],
        desc: 'Mengembangkan dan melatih arsitektur jaringan saraf tiruan kustom (Multi-Layer Perceptron) dengan TensorFlow untuk memprediksi probabilitas tingkat kepatuhan minum obat pasien.',
        members: [3] // Mirza
      },
      {
        title: 'Chatbot Medis (Asep) & Prompt Extraction',
        date: 'Fitur Edukasi & NLP',
        tags: ['RAG Pipeline', 'Generative AI', 'Prompt Engineering'],
        desc: 'Membangun Chatbot asisten medis terintegrasi prompt khusus (Gatekeeper) agar asisten dapat mengekstrak resep secara akurat dan melayani konsultasi interaksi obat.',
        members: [3] // Mirza
      },
      {
        title: 'Memori Pengetahuan Medis Chatbot',
        date: 'Fitur Basis Data',
        tags: ['ChromaDB', 'Vector Embeddings', 'Semantic Search'],
        desc: 'Mengubah dokumen panduan kesehatan tepercaya menjadi data vektor (ChromaDB) agar Chatbot Asep dapat merujuk informasi secara presisi tanpa berhalusinasi.',
        members: [3] // Mirza
      }
    ]
  }
];

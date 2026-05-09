const { supabase } = require('../config/db');

// --- PROFIL ---
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                id,
                name,
                email,
                roles ( name )
            `)
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, user_id, phone, address, birth_date, gender')
            .eq('user_id', userId)
            .maybeSingle();
        
        // Formating ulang response agar rapi
        const formattedProfile = {
            id: profile?.id || null,
            user_id: user.id,
            name: user.name,
            email: user.email,
            role: user.roles?.name,
            phone: profile?.phone || null,
            address: profile?.address || null,
            birth_date: profile?.birth_date || null,
            gender: profile?.gender || null
        };

        // 2. GATEWAY -> FE
        res.status(200).json({ profile: formattedProfile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body; 

        // 1. GATEWAY -> DB: Update data profile
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        
        // 2. GATEWAY -> FE
        res.status(200).json({ profile: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- SINKRONISASI KELUARGA (FAMILY SYNC) ---
const inviteFamily = async (req, res) => {
    try {
        const userId = req.user.id;
        const { email } = req.body; // Email yang diundang

        // 1. Cari User ID berdasarkan Email (karena kita tidak pakai auth.users, kita cek di public.users)
        const { data: invitedUser, error: findError } = await supabase
            .from('users')
            .select('id, role')
            .eq('email', email)
            .single();

        if (findError || !invitedUser) {
            return res.status(404).json({ error: "Pengguna dengan email tersebut tidak ditemukan." });
        }

        // Tentukan siapa patient dan siapa caregiver
        const isSelfPatient = req.user.role === 'patient' || (await checkRole(userId)) === 'patient';
        const patientId = isSelfPatient ? userId : invitedUser.id;
        const caregiverId = isSelfPatient ? invitedUser.id : userId;

        // 2. GATEWAY -> DB: Masukkan status pending/accepted pada tabel family_relations
        const { error: inviteError } = await supabase
            .from('family_relations')
            .insert([{ patient_id: patientId, caregiver_id: caregiverId, status: 'pending' }]);

        if (inviteError) throw inviteError;

        // 3. GATEWAY -> FE
        res.status(200).json({ message: "Undangan Keluarga berhasil dikirim.", status: "pending" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFamilyMembers = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // GATEWAY -> DB: Ambil daftar relasi yang mencakup user ini (Bisa sebagai Patient atau Caregiver)
        const { data, error } = await supabase
            .from('family_relations')
            .select(`
                id, status, created_at,
                patient:patient_id (id, name, email),
                caregiver:caregiver_id (id, name, email)
            `)
            .or(`patient_id.eq.${userId},caregiver_id.eq.${userId}`);

        if (error) throw error;
        
        // 2. GATEWAY -> FE
        res.status(200).json({ members: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Helper
async function checkRole(uid) {
    const { data } = await supabase.from('users').select('roles ( name )').eq('id', uid).single();
    return data?.roles?.name;
}

module.exports = { getProfile, updateProfile, inviteFamily, getFamilyMembers };

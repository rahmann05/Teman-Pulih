const normalizePhone = (rawPhone) => {
    if (!rawPhone) return null;
    const cleaned = rawPhone.replace(/\s+/g, '').replace(/-/g, '');
    if (cleaned.startsWith('+62')) return cleaned;
    if (cleaned.startsWith('62')) return `+${cleaned}`;
    if (cleaned.startsWith('08')) return `+62${cleaned.slice(1)}`;
    return cleaned;
};

const getSupabaseClient = (req) => {
    if (!req.supabase) {
        throw new Error('Supabase client is not initialized for this request.');
    }
    return req.supabase;
};

// Request access to a patient
const requestAccess = async (req, res) => {
    try {
        const caregiverId = req.user.id; // From authMiddleware
        const { identifier } = req.body; // email or phone
        const supabase = getSupabaseClient(req);

        if (!identifier) {
            return res.status(400).json({ error: 'Email atau nomor telepon pasien wajib diisi.' });
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        let patientId = null;
        let patientProfile = null;

        if (isEmail) {
            const { data: user, error } = await supabase
                .from('users')
                .select('id, profiles(phone)')
                .eq('email', identifier.toLowerCase())
                .single();

            if (error || !user) {
                return res.status(404).json({ error: 'Pasien dengan email tersebut tidak ditemukan.' });
            }
            patientId = user.id;
            patientProfile = user.profiles;
        } else {
            const normalizedPhone = normalizePhone(identifier);
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('user_id, phone')
                .eq('phone', normalizedPhone)
                .single();

            if (error || !profile) {
                return res.status(404).json({ error: 'Pasien dengan nomor telepon tersebut tidak ditemukan.' });
            }
            patientId = profile.user_id;
            patientProfile = profile;
        }

        if (patientId === caregiverId) {
            return res.status(400).json({ error: 'Anda tidak bisa menambahkan diri sendiri sebagai pasien.' });
        }

        // Check if relation already exists
        const { data: existingRelation } = await supabase
            .from('family_relations')
            .select('*')
            .eq('caregiver_id', caregiverId)
            .eq('patient_id', patientId)
            .maybeSingle();

        if (existingRelation) {
            if (existingRelation.status === 'accepted') {
                return res.status(400).json({ error: 'Pasien ini sudah ada di daftar Anda.' });
            } else if (existingRelation.status === 'pending') {
                return res.status(400).json({ error: 'Permintaan akses ke pasien ini sedang menunggu persetujuan.' });
            }
        }

        // Create pending relation
        const { data: relation, error: relationError } = await supabase
            .from('family_relations')
            .upsert({
                caregiver_id: caregiverId,
                patient_id: patientId,
                status: 'pending'
            }, { onConflict: 'patient_id, caregiver_id' })
            .select()
            .single();

        if (relationError) throw relationError;

        // Trigger Notification via Edge Function
        // Using HTTP request to the Edge Function URL directly or via Supabase client if configured
        const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_URL || 'https://dbirwtkutyhvywhexwhr.supabase.co/functions/v1/whatsapp-reminder';
        
        try {
            await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    type: 'caregiver_request',
                    relation_id: relation.id,
                    patient_id: patientId,
                    caregiver_id: caregiverId,
                    message: `Halo, ada pengguna yang ingin mengakses jadwal obat Anda sebagai Caregiver. Jika ini benar Anda, silakan buka aplikasi Teman Pulih untuk menyetujui permintaan ini.`
                })
            });
        } catch (fetchError) {
            console.error("Failed to trigger edge function for notification:", fetchError);
            // We don't fail the whole request if notification fails, just log it.
        }

        res.status(200).json({ message: 'Permintaan akses berhasil dikirim ke pasien.', relation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Approve access request (called by patient)
const approveAccess = async (req, res) => {
    try {
        const patientId = req.user.id;
        const { relation_id, status } = req.body; // status should be 'accepted' or 'rejected'
        const supabase = getSupabaseClient(req);

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status tidak valid.' });
        }

        const { data: relation, error } = await supabase
            .from('family_relations')
            .update({ status })
            .eq('id', relation_id)
            .eq('patient_id', patientId)
            .select()
            .single();

        if (error || !relation) {
            return res.status(404).json({ error: 'Permintaan tidak ditemukan atau Anda tidak memiliki akses.' });
        }

        res.status(200).json({ message: `Permintaan akses telah di-${status === 'accepted' ? 'setujui' : 'tolak'}.`, relation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get pending requests for the patient
const getPendingRequests = async (req, res) => {
    try {
        const patientId = req.user.id;
        const supabase = getSupabaseClient(req);
        
        const { data, error } = await supabase
            .from('family_relations')
            .select(`
                id, 
                created_at,
                caregiver:users!caregiver_id(id, name, email)
            `)
            .eq('patient_id', patientId)
            .eq('status', 'pending');

        if (error) throw error;

        res.status(200).json({ requests: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { requestAccess, approveAccess, getPendingRequests };
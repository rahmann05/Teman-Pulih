const emrService = require('../services/emrService');

const parseDocument = async (req, res, next) => {
    emrService.upload(req, res, async (err) => {
        if (err) return next(Object.assign(err, { statusCode: 400 }));
        if (!req.file) return next(Object.assign(new Error('Tidak ada file yang diunggah.'), { statusCode: 400 }));

        try {
            const data = await emrService.parseDocument(req.file.buffer, req.file.mimetype);
            res.status(200).json({ message: 'Dokumen berhasil diproses menggunakan ekstraksi lokal.', data });
        } catch (error) {
            console.error('[EMR Parser Error]:', error);
            next(error);
        }
    });
};

module.exports = { parseDocument };

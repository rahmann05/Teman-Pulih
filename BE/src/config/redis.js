const Redis = require('ioredis');

// Gunakan koneksi ke loka/ cloud (REDIS_URL dari file .env)
// Jika belum menginstall redis-server di laptop, kamu bisa pakai public redis cloud seperti Upstash
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redis = new Redis(redisUrl, {
    retryStrategy(times) {
        // Jika gagal koneksi (misal redis belum menyala), coba lagi dalam 50 milidetik, max 2000 ms.
        // Jika lebih dari 5 kali, biarkan error (jangan sampai node.js hang).
        if (times > 5) {
            console.warn('[REDIS] Gagal menyambung ke server Redis (Pastikan Redis berjalan). Fitur Caching dinonaktifkan sementara.');
            return null; // Return null stops retrying
        }
        return Math.min(times * 50, 2000);
    }
});

redis.on('connect', () => {
    console.log('[REDIS] Berhasil terhubung ke server Memori.');
});

redis.on('error', (err) => {
    // Abaikan logging error berkali-kali jika server redis tidak dinyalakan, cukup peringatkan sekali di retryStrategy
});

module.exports = redis;
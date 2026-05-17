const redis = require('../config/redis');

const cacheGet = async (key) => {
    if (redis.status !== 'ready') return null;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
};

const cacheSet = async (key, data, ttlSeconds = 14400) => {
    if (redis.status !== 'ready') return;
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
};

const cacheDel = async (...keys) => {
    if (redis.status !== 'ready') return;
    await Promise.all(keys.map(key => redis.del(key)));
};

module.exports = { cacheGet, cacheSet, cacheDel };

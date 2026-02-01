// services/cache.js
const store = new Map();

// 5 dakika TTL (istersen değiştir)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function now() {
  return Date.now();
}

function makeKey(parts) {
  return parts.filter(Boolean).join("|");
}

function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;

  // süresi geçtiyse sil
  if (entry.expiresAt && entry.expiresAt < now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, {
    value,
    expiresAt: ttlMs ? now() + ttlMs : null,
  });
}

module.exports = { makeKey, getCache, setCache };
const cache = new Map();

function makeKey(parts) {
  return parts.join(":");
}

function getCache(key) {
  if (cache.has(key)) {
    console.log("🟢 CACHE HIT:", key);
    return cache.get(key);
  }
  console.log("🔴 CACHE MISS:", key);
  return null;
}

function setCache(key, value) {
  console.log("💾 CACHE SET:", key);
  cache.set(key, value);
}

module.exports = {
  makeKey,
  getCache,
  setCache
};


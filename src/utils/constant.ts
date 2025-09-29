// Cache configuration
const CACHE_CONFIG = {
  list: 5 * 60, // 5 minutes
  detail: 10 * 60, // 10 minutes
  analytics: 15 * 60, // 15 minutes
};

// Pagination defaults
const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
};

export { CACHE_CONFIG, PAGINATION };

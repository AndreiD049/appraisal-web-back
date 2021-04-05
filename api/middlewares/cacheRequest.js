const cacheRequest = ({ publicCache, privateCache, maxAge, mustRevalidate, noCache }) => (
  req,
  res,
  next,
) => {
  let result = '';
  try {
    if (process.env.NODE_ENV === 'production') {
      if (publicCache) {
        result += 'public, ';
      }
      if (privateCache) {
        result += 'private, ';
      }
      if (maxAge) {
        result += `max-age=${maxAge}, `;
      }
      if (mustRevalidate) {
        result += 'must-revalidate, ';
      }
      if (noCache) {
        result += 'no-cache, ';
      }
      if (result) {
        res.set('Cache-control', result.slice(0, -2));
      }
    }
  } finally {
    next();
  }
};

module.exports = cacheRequest;

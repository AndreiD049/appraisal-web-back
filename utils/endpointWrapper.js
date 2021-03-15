const endpointWrapper = async (next, func) => {
  try {
    const result = await func();
    return result;
  } catch (err) {
    next(err);
    return null;
  }
}

module.exports = endpointWrapper;

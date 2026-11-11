function storeBrandRating(stores) {
  const valid = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
  const apple = valid(stores.apple.rating);
  const google = valid(stores.google.rating);
  const values = [stores.apple.rating, stores.google.rating].filter(valid);
  const basis = apple && google ? 'Equal average of Apple App Store and Google Play ratings'
    : apple ? 'Single source: Apple App Store'
      : google ? 'Single source: Google Play' : 'No store rating available';
  return {
    rating: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    sampleSize: 0,
    basis,
    components: [],
  };
}

module.exports = { storeBrandRating };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { geocodeAddress, reverseGeocode } = require('../dist/integrations/maps/geocoding');
const { searchPlaces } = require('../dist/integrations/maps/places');

test('Google geocoding normalizes responses and handles failures without leaking keys', async () => {
  const originalGet = axios.get;
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;
  const originalProvider = process.env.MAPS_PROVIDER;
  process.env.MAPS_PROVIDER = 'google';
  process.env.GOOGLE_MAPS_API_KEY = 'test-server-key';
  const calls = [];
  const result = { place_id: 'google-place', formatted_address: 'Mumbai, Maharashtra, India', geometry: { location: { lat: 19.07, lng: 72.87 } }, types: ['street_address'], address_components: [{ long_name: 'Mumbai', types: ['locality'] }, { long_name: 'Maharashtra', types: ['administrative_area_level_1'] }, { long_name: '400001', types: ['postal_code'] }] };
  try {
    axios.get = async (url, options) => { calls.push({ url, options }); return { data: { status: 'OK', results: [result] } }; };
    assert.equal((await searchPlaces('Mumbai'))[0].place_id, 'google-place');
    assert.equal((await geocodeAddress('Mumbai')).latitude, 19.07);
    const reverse = await reverseGeocode(19.07, 72.87);
    assert.equal(reverse.city, 'Mumbai');
    assert.equal(reverse.postal_code, '400001');
    assert.equal(calls[0].options.params.components, 'country:IN');
    assert.equal(calls[2].options.params.latlng, '19.07,72.87');
    await assert.rejects(reverseGeocode(91, 0), /Invalid coordinates/);
    axios.get = async () => ({ data: { status: 'ZERO_RESULTS', results: [] } });
    assert.deepEqual(await searchPlaces('Unknown address'), []);
    await assert.rejects(reverseGeocode(0, 0), /Address not found/);
    axios.get = async () => ({ data: { status: 'REQUEST_DENIED', error_message: 'test-server-key' } });
    await assert.rejects(searchPlaces('Mumbai'), error => error.statusCode === 503 && !error.message.includes('test-server-key'));
    axios.get = async () => ({ data: { status: 'OVER_QUERY_LIMIT' } });
    await assert.rejects(searchPlaces('Mumbai'), /quota exceeded/);
    delete process.env.GOOGLE_MAPS_API_KEY;
    await assert.rejects(searchPlaces('Mumbai'), /not configured/);
  } finally {
    axios.get = originalGet;
    if (originalKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY; else process.env.GOOGLE_MAPS_API_KEY = originalKey;
    if (originalProvider === undefined) delete process.env.MAPS_PROVIDER; else process.env.MAPS_PROVIDER = originalProvider;
  }
});

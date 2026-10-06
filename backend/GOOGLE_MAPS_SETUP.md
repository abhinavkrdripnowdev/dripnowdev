# Google Maps setup

1. In your Google Cloud project, link billing and enable Geocoding API and Maps JavaScript API.
2. Create a server key restricted to Geocoding API and the backend's outbound IP addresses.
3. Set `MAPS_PROVIDER=google` and `GOOGLE_MAPS_API_KEY` in backend `.env` or hosting secrets.
4. Create a separate browser key restricted to Maps JavaScript API and your frontend HTTP referrers (including localhost during development).
5. Set `VITE_MAPS_PROVIDER=google` and `VITE_GOOGLE_MAPS_BROWSER_KEY` in frontend `.env`, then rebuild the frontend.
6. Configure quotas and billing alerts in Google Cloud. Never commit server keys or real environment files.

Location search is an explicit address lookup, not autocomplete. Google responses are normalized to the existing API shape. Empty results, invalid coordinates, missing keys, quota errors and provider failures are handled explicitly. The Google adapter does not retain responses in its cache.

Setup: https://developers.google.com/maps/documentation/geocoding/get-api-key
Key restrictions: https://developers.google.com/maps/api-security-best-practices

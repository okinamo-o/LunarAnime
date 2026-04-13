// ============================================================
// 🎯 AD NETWORK CONFIGURATION
// ============================================================
// 
// HOW TO USE:
// 1. Sign up at one of these crypto-friendly ad networks:
//    - Monetag:      https://monetag.com       (best for streaming sites)
//    - HilltopAds:   https://hilltopads.com    (good CPM rates)
//    - PopAds:       https://popads.net        (pop-under specialist)
//    - A-Ads:        https://a-ads.com         (Bitcoin-native, no KYC)
//    - Adsterra:     https://adsterra.com      (wide format support)
//
// 2. After approval, paste your Publisher/Zone IDs below
// 3. Set ENABLED to true
// 4. Ads will automatically appear in all pre-configured slots
// ============================================================

const ADS_CONFIG = {
  // Master switch — set to true once you have your ad codes
  ENABLED: false,

  // Which network are you using? Pick one: 'monetag' | 'hilltopads' | 'adsterra' | 'a-ads' | 'custom'
  NETWORK: 'monetag',

  // ---- MONETAG ----
  monetag: {
    // Your Monetag site ID (you get this after adding your site)
    siteId: 'YOUR_MONETAG_SITE_ID',
    // Banner zone IDs for different placements
    bannerZone: 'YOUR_BANNER_ZONE_ID',         // 728x90 leaderboard
    rectangleZone: 'YOUR_RECTANGLE_ZONE_ID',    // 300x250 medium rectangle
    nativeZone: 'YOUR_NATIVE_ZONE_ID',          // Native / in-feed ads
    // Pop-under (shows new tab on first click) — high revenue, use wisely
    popunderEnabled: false,
    popunderZone: 'YOUR_POPUNDER_ZONE_ID',
  },

  // ---- HILLTOPADS ----
  hilltopads: {
    siteId: 'YOUR_HILLTOPADS_SITE_ID',
    bannerZone: 'YOUR_BANNER_ZONE_ID',
    rectangleZone: 'YOUR_RECTANGLE_ZONE_ID',
    popunderEnabled: false,
    popunderZone: 'YOUR_POPUNDER_ZONE_ID',
  },

  // ---- ADSTERRA ----
  adsterra: {
    siteId: 'YOUR_ADSTERRA_SITE_ID',
    bannerKey: 'YOUR_BANNER_KEY',
    nativeBannerKey: 'YOUR_NATIVE_BANNER_KEY',
    popunderEnabled: false,
    popunderKey: 'YOUR_POPUNDER_KEY',
  },

  // ---- A-ADS (Bitcoin native, no KYC needed) ----
  'a-ads': {
    adUnitId: 'YOUR_A_ADS_UNIT_ID',   // e.g. '123456'
  },

  // ---- CUSTOM (paste raw script tags) ----
  custom: {
    // Paste your raw ad script here as a string
    headerScript: '',   // Loaded once in <head>
    bannerHtml: '',     // Injected into banner slots
    rectangleHtml: '',  // Injected into rectangle slots
  },

  // ---- PLACEMENT SETTINGS ----
  placements: {
    // Show a banner between carousels on the home page
    homeBanners: true,
    // Show a rectangle ad on the movie details sidebar
    detailsSidebar: true,
    // Show a banner above the search results grid
    searchBanner: true,
    // Show a small banner below the video player
    watchBanner: true,
  }
};

export default ADS_CONFIG;

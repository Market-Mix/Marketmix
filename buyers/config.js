// Determine environment
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

// API Configuration
const CONFIG = {
  // API Base URL - automatically switches based on environment
  API_BASE_URL: isDevelopment 
    ? 'http://localhost:5000/api'  // Local development
    : 'https://marketmix-backend.onrender.com/api',  // Production

  // Other settings
  APP_NAME: 'MarketMix',
  APP_VERSION: '1.0.0',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  
  // Timeouts
  API_TIMEOUT: 30000, // 30 seconds
  
  // Storage keys
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    USER_ROLE: 'userRole',
    CART: 'cart'
  }
};

// Export for use in other files
window.CONFIG = CONFIG;

// Helper function to get auth token
function getAuthToken() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
}

// Helper function to get current user
function getCurrentUser() {
  const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
  return userStr ? JSON.parse(userStr) : null;
}

// Helper function to check if user is logged in
function isLoggedIn() {
  return !!getAuthToken();
}

// Helper function to logout
function logout() {
  ['token','user','buyer_token','buyer_user','userRole'].forEach(k => localStorage.removeItem(k));
  window.location.href = 'login.html';
}

// Export helpers
window.Auth = {
  getToken: getAuthToken,
  getUser: getCurrentUser,
  isLoggedIn: isLoggedIn,
  logout: logout
};

console.log('🚀 MarketMix Config Loaded:', {
  environment: isDevelopment ? 'Development' : 'Production',
  apiUrl: CONFIG.API_BASE_URL
});

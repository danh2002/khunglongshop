const config = {
  apiBaseUrl: process.env.API_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
};

export default config;


// Re-export the login page from src/app - root app/ takes precedence over src/app/
// so we need this file for Next.js route resolution
export { default } from '../../src/app/login/page';

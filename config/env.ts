/**
 * Environment Configuration for UDC Portals
 * Supports DO, RSS, and CSS portals across multiple environments
 */

export type Environment = 'dev' | 'qat' | 'uat' | 'prod';
export type Portal = 'do' | 'rss' | 'css';

interface PortalConfig {
  baseUrl: string;
  apiUrl: string;
  name: string;
}

interface EnvironmentConfig {
  do: PortalConfig;
  rss: PortalConfig;
  css: PortalConfig;
}

const environments: Record<Environment, EnvironmentConfig> = {
  dev: {
    do: {
      baseUrl: 'https://do-dev.udc.com',
      apiUrl: 'https://api-do-dev.udc.com',
      name: 'DO Portal - DEV',
    },
    rss: {
      baseUrl: 'https://rss-dev.udc.com',
      apiUrl: 'https://api-rss-dev.udc.com',
      name: 'RSS Portal - DEV',
    },
    css: {
      baseUrl: 'https://css-dev.udc.com',
      apiUrl: 'https://api-css-dev.udc.com',
      name: 'CSS Portal - DEV',
    },
  },
  qat: {
    do: {
      baseUrl: 'https://do-qat.udc.com',
      apiUrl: 'https://api-do-qat.udc.com',
      name: 'DO Portal - QAT',
    },
    rss: {
      baseUrl: 'https://rss-qat.udc.com',
      apiUrl: 'https://api-rss-qat.udc.com',
      name: 'RSS Portal - QAT',
    },
    css: {
      baseUrl: 'https://css-qat.udc.com',
      apiUrl: 'https://api-css-qat.udc.com',
      name: 'CSS Portal - QAT',
    },
  },
  uat: {
    do: {
      baseUrl: 'https://do-uat.udc.com',
      apiUrl: 'https://api-do-uat.udc.com',
      name: 'DO Portal - UAT',
    },
    rss: {
      baseUrl: 'https://rss-uat.udc.com',
      apiUrl: 'https://api-rss-uat.udc.com',
      name: 'RSS Portal - UAT',
    },
    css: {
      baseUrl: 'https://css-uat.udc.com',
      apiUrl: 'https://api-css-uat.udc.com',
      name: 'CSS Portal - UAT',
    },
  },
  prod: {
    do: {
      baseUrl: 'https://do.udc.com',
      apiUrl: 'https://api-do.udc.com',
      name: 'DO Portal - PROD',
    },
    rss: {
      baseUrl: 'https://rss.udc.com',
      apiUrl: 'https://api-rss.udc.com',
      name: 'RSS Portal - PROD',
    },
    css: {
      baseUrl: 'https://css.udc.com',
      apiUrl: 'https://api-css.udc.com',
      name: 'CSS Portal - PROD',
    },
  },
};

// Get current environment from env variable or default to 'qat'
export const CURRENT_ENV: Environment = (process.env.TEST_ENV as Environment) || 'qat';

// Get portal config for current environment
export function getPortalConfig(portal: Portal): PortalConfig {
  return environments[CURRENT_ENV][portal];
}

// Get specific portal URLs
export const DO_CONFIG = () => getPortalConfig('do');
export const RSS_CONFIG = () => getPortalConfig('rss');
export const CSS_CONFIG = () => getPortalConfig('css');

// Export current environment URLs for each portal
export const DO_BASE_URL = () => DO_CONFIG().baseUrl;
export const RSS_BASE_URL = () => RSS_CONFIG().baseUrl;
export const CSS_BASE_URL = () => CSS_CONFIG().baseUrl;

export { environments };





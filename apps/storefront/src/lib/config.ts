// Storefront configuration loader
//
// Reads storefront.config.json at build time via resolveJsonModule.
// Runtime overrides via NEXT_PUBLIC_API_URL environment variable.

import rawConfig from '../../storefront.config.json';

export interface StorefrontAppConfig {
  storefrontSlug: string;
  apiUrl: string;
  relayUrls: string[];
  theme: {
    primaryColor: string;
    accentColor: string;
  };
}

const config: StorefrontAppConfig = {
  storefrontSlug: rawConfig.storefrontSlug,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || rawConfig.apiUrl,
  relayUrls: rawConfig.relayUrls,
  theme: {
    primaryColor: rawConfig.theme?.primaryColor ?? '#6366f1',
    accentColor: rawConfig.theme?.accentColor ?? '#f59e0b',
  },
};

export default config;

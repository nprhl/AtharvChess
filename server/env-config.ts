// Environment configuration for production-grade chess AI system
// This file manages secure API key handling and system configuration

export interface ProductionConfig {
  // MAIA-2 Human-AI Alignment Engine
  maia2: {
    enabled: boolean;
    apiEndpoint: string;
    apiKey: string;
    timeout: number;
    maxRetries: number;
    rateLimitPerMinute: number;
    enableCaching: boolean;
    cacheExpiryMinutes: number;
  };
  
  // OpenAI GPT-4o Engine
  openai: {
    enabled: boolean;
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  
  // System Security Settings
  security: {
    enableRateLimit: boolean;
    enableRequestValidation: boolean;
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    enableEncryption: boolean;
  };
  
  // Database Security
  database: {
    enableSSL: boolean;
    enableConnectionPooling: boolean;
    maxConnections: number;
    enableQueryLogging: boolean;
  };
}

export function getProductionConfig(): ProductionConfig {
  return {
    maia2: {
      enabled: !!process.env.MAIA2_API_KEY,
      apiEndpoint: process.env.MAIA2_API_ENDPOINT || 'https://api.maia2.ai/v1',
      apiKey: process.env.MAIA2_API_KEY || '',
      timeout: parseInt(process.env.MAIA2_TIMEOUT || '10000'),
      maxRetries: parseInt(process.env.MAIA2_MAX_RETRIES || '3'),
      rateLimitPerMinute: parseInt(process.env.MAIA2_RATE_LIMIT || '60'),
      enableCaching: process.env.MAIA2_ENABLE_CACHE !== 'false',
      cacheExpiryMinutes: parseInt(process.env.MAIA2_CACHE_EXPIRY || '30')
    },
    
    openai: {
      enabled: !!process.env.OPENAI_API_KEY,
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '150'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1')
    },
    
    security: {
      enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
      enableRequestValidation: process.env.ENABLE_REQUEST_VALIDATION !== 'false',
      enableMetrics: process.env.ENABLE_METRICS !== 'false',
      enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
      enableEncryption: process.env.ENABLE_ENCRYPTION !== 'false'
    },
    
    database: {
      enableSSL: process.env.DB_ENABLE_SSL === 'true',
      enableConnectionPooling: process.env.DB_ENABLE_POOLING !== 'false',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      enableQueryLogging: process.env.DB_ENABLE_LOGGING === 'true'
    }
  };
}

// Validate production configuration
export function validateProductionConfig(config: ProductionConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Security validations
  if (!config.security.enableRateLimit) {
    errors.push('Rate limiting should be enabled in production');
  }
  
  if (!config.security.enableRequestValidation) {
    errors.push('Request validation should be enabled in production');
  }
  
  if (!config.security.enableEncryption && process.env.NODE_ENV === 'production') {
    errors.push('Encryption must be enabled in production environment');
  }
  
  // API key validations
  if (config.maia2.enabled && !config.maia2.apiKey) {
    errors.push('MAIA-2 API key is required when enabled');
  }
  
  if (config.openai.enabled && !config.openai.apiKey) {
    errors.push('OpenAI API key is required when enabled');
  }
  
  // Database validations
  if (process.env.NODE_ENV === 'production' && !config.database.enableSSL) {
    errors.push('Database SSL should be enabled in production');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Production environment setup guide
export const PRODUCTION_SETUP_GUIDE = {
  requiredEnvironmentVariables: [
    'DATABASE_URL',
    'NODE_ENV=production',
    'OPENAI_API_KEY (for educational features)',
    'MAIA2_API_KEY (for human-AI alignment - when available)'
  ],
  
  optionalEnvironmentVariables: [
    'MAIA2_API_ENDPOINT',
    'MAIA2_TIMEOUT',
    'MAIA2_MAX_RETRIES',
    'MAIA2_RATE_LIMIT',
    'ENABLE_RATE_LIMIT=true',
    'ENABLE_REQUEST_VALIDATION=true',
    'ENABLE_METRICS=true',
    'ENABLE_ENCRYPTION=true',
    'DB_ENABLE_SSL=true',
    'DB_MAX_CONNECTIONS=20'
  ],
  
  securityChecklist: [
    '✓ Enable HTTPS/TLS encryption',
    '✓ Set up rate limiting',
    '✓ Enable request validation',
    '✓ Configure database SSL',
    '✓ Set strong API keys',
    '✓ Enable health monitoring',
    '✓ Configure logging and metrics',
    '✓ Set up backup and recovery',
    '✓ Configure firewall rules',
    '✓ Enable DDoS protection'
  ]
};

console.log('Production configuration loaded with security validation enabled');
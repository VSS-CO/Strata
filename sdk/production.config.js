/**
 * Strata SDK - Production Configuration
 * Optimized settings for production deployments
 */

export default {
  // Build settings
  build: {
    // Optimization level for production
    optimization: 'O3',

    // Enable source maps for debugging
    sourceMaps: false,

    // Minify output
    minify: true,

    // Strip debug symbols
    stripDebug: true,

    // Target specification
    target: 'c',

    // Output configuration
    output: {
      dir: './dist',
      // Split code into chunks
      chunks: true,
      // Parallel processing
      parallel: true,
      // Number of workers
      workers: 4
    }
  },

  // Runtime settings
  runtime: {
    // Execution timeout (milliseconds)
    timeout: 30000,

    // Memory limit
    memory: {
      limit: '512mb',
      gc: 'aggressive'
    },

    // Environment
    env: {
      NODE_ENV: 'production',
      DEBUG: false,
      LOG_LEVEL: 'error'
    },

    // Process management
    process: {
      // Restart on crash
      autoRestart: true,
      // Max restarts
      maxRestarts: 3,
      // Cooldown between restarts (ms)
      cooldown: 5000
    }
  },

  // Compiler settings
  compiler: {
    // Type checking
    typeChecking: true,

    // Strict mode
    strict: true,

    // Warning level
    warnings: 'strict',

    // Code quality
    quality: {
      // Enable linting
      lint: true,
      // Enable code analysis
      analyze: true,
      // Report unused code
      unusedCode: true
    }
  },

  // Security settings
  security: {
    // Sandbox execution
    sandbox: true,

    // Resource limits
    limits: {
      // Maximum file size (bytes)
      maxFileSize: 10485760, // 10MB
      // Maximum execution time (ms)
      maxTime: 30000,
      // Maximum memory (bytes)
      maxMemory: 536870912 // 512MB
    },

    // Allowed imports
    allowedImports: [
      'std::io',
      'std::math',
      'std::text',
      'std::list',
      'std::map',
      'std::file',
      'std::time'
    ]
  },

  // Monitoring and logging
  monitoring: {
    // Enable metrics collection
    metrics: true,

    // Logging
    logging: {
      // Log level: 'error', 'warn', 'info', 'debug'
      level: 'error',

      // Log file
      file: './logs/strata.log',

      // Max log file size
      maxSize: 10485760, // 10MB

      // Log retention
      retention: 30 // days
    },

    // Performance tracking
    performance: {
      enabled: true,
      samplingRate: 0.1 // 10% of operations
    },

    // Error reporting
    errors: {
      // Report errors to external service
      reportToService: false,
      // Service endpoint
      serviceEndpoint: 'https://errors.example.com/api/errors'
    }
  },

  // Caching
  caching: {
    // Enable compilation cache
    compileCache: true,

    // Cache directory
    cacheDir: './.strata/cache',

    // Cache TTL (seconds)
    ttl: 86400 // 24 hours
  },

  // Deployment
  deployment: {
    // Docker support
    docker: {
      enabled: true,
      image: 'strata-app:latest',
      healthCheck: {
        enabled: true,
        interval: '30s',
        timeout: '10s',
        retries: 3
      }
    },

    // CI/CD integration
    cicd: {
      // GitHub Actions
      github: {
        enabled: true,
        workflowFile: '.github/workflows/strata.yml'
      },

      // GitLab CI
      gitlab: {
        enabled: false,
        ciFile: '.gitlab-ci.yml'
      }
    },

    // Health checks
    healthChecks: {
      enabled: true,
      interval: 60000, // 1 minute
      endpoints: [
        '/health',
        '/metrics',
        '/status'
      ]
    }
  },

  // Versioning and updates
  versioning: {
    // Check for updates
    checkUpdates: true,

    // Update frequency (hours)
    updateFrequency: 24,

    // Auto-update
    autoUpdate: false,

    // Version file
    versionFile: '.strata/version'
  }
};

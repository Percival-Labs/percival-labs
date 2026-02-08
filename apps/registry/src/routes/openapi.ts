// Percival Labs - OpenAPI 3.1.0 Specification & Swagger UI
// Auto-generated spec documenting all registry API endpoints

import { Hono } from 'hono';

// ── Reusable Schemas ──

const schemas = {
  Publisher: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', description: 'Publisher UUID' },
      github_id: { type: 'string', description: 'GitHub user ID' },
      display_name: { type: 'string', description: 'Public display name' },
      email: { type: 'string', format: 'email' },
      verified_at: { type: 'string', format: 'date-time', nullable: true },
      trust_score: { type: 'number', minimum: 0, maximum: 100, description: 'Publisher trust score (0-100)' },
      created_at: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'github_id', 'display_name'],
  },
  Skill: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      publisher_id: { type: 'string', format: 'uuid' },
      name: { type: 'string', description: 'Human-readable skill name' },
      slug: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$', description: 'URL-safe identifier' },
      category: { type: 'string', description: 'Skill category (e.g. development, security, content)' },
      description: { type: 'string' },
      homepage: { type: 'string', format: 'uri', nullable: true },
      repository: { type: 'string', format: 'uri', nullable: true },
      visibility: { type: 'string', enum: ['draft', 'pending', 'published', 'suspended'] },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'publisher_id', 'name', 'slug', 'description', 'visibility'],
  },
  Version: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      skill_id: { type: 'string', format: 'uuid' },
      semver: { type: 'string', description: 'Semantic version (e.g. 1.0.0)' },
      content_hash: { type: 'string', description: 'SHA-256 hash of skill content' },
      manifest: { type: 'object', description: 'Parsed skill manifest' },
      readme: { type: 'string', description: 'Skill README content (markdown)' },
      download_url: { type: 'string', format: 'uri', nullable: true },
      audit_status: { type: 'string', enum: ['pending', 'pass', 'fail', 'escalate'] },
      created_at: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'skill_id', 'semver', 'content_hash', 'audit_status'],
  },
  TrustScore: {
    type: 'object',
    properties: {
      overall: { type: 'number', minimum: 0, maximum: 100, description: 'Composite trust score' },
      breakdown: {
        type: 'object',
        properties: {
          publisher_verification: { type: 'number', description: 'Publisher identity verification score' },
          audit_history: { type: 'number', description: 'Audit pass history score' },
          community_rating: { type: 'number', description: 'Community rating score' },
          age_stability: { type: 'number', description: 'Time since publish and update stability' },
          capability_scope: { type: 'number', description: 'Minimal capability request score' },
        },
      },
      computed_at: { type: 'string', format: 'date-time' },
    },
    required: ['overall', 'breakdown', 'computed_at'],
  },
  Finding: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      version_id: { type: 'string', format: 'uuid' },
      stage: { type: 'string', enum: ['static', 'semantic', 'sandbox', 'human'] },
      status: { type: 'string', enum: ['pass', 'fail', 'escalate'] },
      results: { type: 'object', description: 'Stage-specific audit results' },
      created_at: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'version_id', 'stage', 'status', 'results'],
  },
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string', description: 'Human-readable error message' },
      code: { type: 'string', description: 'Machine-readable error code' },
    },
    required: ['error'],
  },
  RateLimitError: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Rate limit exceeded' },
      retryAfter: { type: 'integer', description: 'Seconds until rate limit resets' },
    },
    required: ['error', 'retryAfter'],
  },
} as const;

// ── Reusable Responses ──

const responses = {
  NotFound: {
    description: 'Resource not found',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  Unauthorized: {
    description: 'Authentication required',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  BadRequest: {
    description: 'Invalid request parameters',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  Conflict: {
    description: 'Resource already exists',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  },
  RateLimited: {
    description: 'Rate limit exceeded',
    headers: {
      'Retry-After': { schema: { type: 'integer' }, description: 'Seconds until rate limit resets' },
      'X-RateLimit-Limit': { schema: { type: 'integer' }, description: 'Max requests per window' },
      'X-RateLimit-Remaining': { schema: { type: 'integer' }, description: 'Remaining requests' },
      'X-RateLimit-Reset': { schema: { type: 'integer' }, description: 'Unix timestamp when window resets' },
    },
    content: { 'application/json': { schema: { $ref: '#/components/schemas/RateLimitError' } } },
  },
};

// ── Rate Limit Headers (applied to all responses) ──

const rateLimitHeaders = {
  'X-RateLimit-Limit': { schema: { type: 'integer' }, description: 'Max requests per window' },
  'X-RateLimit-Remaining': { schema: { type: 'integer' }, description: 'Remaining requests in window' },
  'X-RateLimit-Reset': { schema: { type: 'integer' }, description: 'Unix timestamp when window resets' },
};

// ── OpenAPI Spec ──

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Percival Labs Registry API',
    version: '0.2.0',
    description: 'Security-verified registry for Skills.md and MCP servers',
    contact: {
      name: 'Percival Labs',
      url: 'https://github.com/percival-labs',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    { url: 'http://localhost:3100', description: 'Local development' },
  ],
  tags: [
    { name: 'Health', description: 'Service health and statistics' },
    { name: 'Skills', description: 'Skill discovery, publishing, and management' },
    { name: 'Trust', description: 'Trust scoring and community feedback' },
    { name: 'Verification', description: 'Skill content verification pipeline' },
    { name: 'Publishers', description: 'Publisher registration and profiles' },
    { name: 'Auth', description: 'Authentication and authorization' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained via GitHub OAuth flow',
      },
    },
    schemas,
    responses,
  },
  paths: {
    // ── Health ──
    '/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Health check',
        description: 'Returns service health status and database connectivity.',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                    version: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '503': {
            description: 'Service unhealthy (database unavailable)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['unhealthy'] },
                    error: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/health/stats': {
      get: {
        operationId: 'getRegistryStats',
        summary: 'Registry statistics',
        description: 'Returns aggregate counts for publishers, skills, versions, installations, ratings, and reports.',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Registry statistics',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stats: {
                      type: 'object',
                      properties: {
                        publishers: { type: 'integer' },
                        skills: { type: 'integer' },
                        skills_pending: { type: 'integer' },
                        versions: { type: 'integer' },
                        installations: { type: 'integer' },
                        ratings: { type: 'integer' },
                        reports_open: { type: 'integer' },
                        mcp_servers: { type: 'integer' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Skills: Discovery ──
    '/v1/skills': {
      get: {
        operationId: 'listSkills',
        summary: 'List and search skills',
        description: 'Browse or search the skill registry. Supports full-text search, category filtering, and trust score thresholds.',
        tags: ['Skills'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            description: 'Search query (matches name, description, tags)',
            schema: { type: 'string' },
          },
          {
            name: 'category',
            in: 'query',
            required: false,
            description: 'Filter by category',
            schema: { type: 'string' },
          },
          {
            name: 'trust_min',
            in: 'query',
            required: false,
            description: 'Minimum trust score (0-100)',
            schema: { type: 'number', minimum: 0, maximum: 100 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Results per page (default 20, max 100)',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            description: 'Pagination offset',
            schema: { type: 'integer', default: 0, minimum: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of skills',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    skills: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Skill' },
                    },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' },
                  },
                },
              },
            },
          },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
      post: {
        operationId: 'createSkill',
        summary: 'Create a new skill',
        description: 'Register a new skill in the registry. Requires authenticated publisher.',
        tags: ['Skills'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Human-readable skill name' },
                  slug: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$', description: 'URL-safe identifier (2-64 chars)' },
                  category: { type: 'string', description: 'Skill category' },
                  description: { type: 'string', description: 'Skill description' },
                  homepage: { type: 'string', format: 'uri' },
                  repository: { type: 'string', format: 'uri' },
                },
                required: ['name', 'slug', 'description'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Skill created',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    skill: { $ref: '#/components/schemas/Skill' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': { $ref: '#/components/responses/Conflict' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Skills: Detail ──
    '/v1/skills/{slug}': {
      get: {
        operationId: 'getSkill',
        summary: 'Get skill detail',
        description: 'Returns full skill information including publisher, versions, capabilities, and trust score.',
        tags: ['Skills'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Skill detail',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    skill: {
                      allOf: [
                        { $ref: '#/components/schemas/Skill' },
                        {
                          type: 'object',
                          properties: {
                            publisher: { $ref: '#/components/schemas/Publisher' },
                          },
                        },
                      ],
                    },
                    versions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Version' },
                    },
                    capabilities: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          resource: { type: 'string' },
                          permissions: { type: 'array', items: { type: 'string' } },
                          required: { type: 'boolean' },
                        },
                      },
                    },
                    trust: { $ref: '#/components/schemas/TrustScore' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Skills: Versions ──
    '/v1/skills/{slug}/versions/{version}': {
      get: {
        operationId: 'getVersion',
        summary: 'Get version detail',
        description: 'Returns version metadata, parsed manifest, and audit findings.',
        tags: ['Skills'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'version', in: 'path', required: true, schema: { type: 'string' }, description: 'Semantic version (e.g. 1.0.0)' },
        ],
        responses: {
          '200': {
            description: 'Version detail with audit findings',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    version: { $ref: '#/components/schemas/Version' },
                    audit: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Finding' },
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
      put: {
        operationId: 'publishVersion',
        summary: 'Publish a new version',
        description: 'Submit a new skill version for verification. Triggers the L1/L2 audit pipeline. Auto-publishes if both stages pass.',
        tags: ['Skills'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'version', in: 'path', required: true, schema: { type: 'string' }, description: 'Semantic version to publish' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  manifest: { type: 'object', description: 'Skill manifest (SkillManifest schema)' },
                  readme: { type: 'string', description: 'README content (markdown)' },
                  content_hash: { type: 'string', description: 'SHA-256 hash of skill content bundle' },
                },
                required: ['manifest', 'content_hash'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Version submitted and verification results',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    version_id: { type: 'string', format: 'uuid' },
                    audit_status: { type: 'string', enum: ['pass', 'fail', 'escalate', 'pending'] },
                    verification: {
                      type: 'object',
                      properties: {
                        l1: {
                          type: 'object',
                          properties: {
                            status: { type: 'string' },
                            score: { type: 'number' },
                            errors: { type: 'array', items: { type: 'string' } },
                          },
                        },
                        l2: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            status: { type: 'string' },
                            summary: { type: 'string' },
                          },
                        },
                      },
                    },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': {
            description: 'Not the skill owner',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Trust ──
    '/v1/skills/{slug}/trust': {
      get: {
        operationId: 'getTrustScore',
        summary: 'Get trust score',
        description: 'Returns the composite trust score with breakdown, community ratings, and install count.',
        tags: ['Trust'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Trust score with breakdown',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    trust: { $ref: '#/components/schemas/TrustScore' },
                    ratings: {
                      type: 'object',
                      properties: {
                        average: { type: 'number' },
                        count: { type: 'integer' },
                        distribution: {
                          type: 'object',
                          properties: {
                            '1': { type: 'integer' },
                            '2': { type: 'integer' },
                            '3': { type: 'integer' },
                            '4': { type: 'integer' },
                            '5': { type: 'integer' },
                          },
                        },
                      },
                    },
                    installs: { type: 'integer' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Ratings ──
    '/v1/skills/{slug}/ratings': {
      post: {
        operationId: 'rateSkill',
        summary: 'Rate a skill',
        description: 'Submit a rating (1-5) and optional review for a skill.',
        tags: ['Trust'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  agent_id: { type: 'string', description: 'Rating agent identifier' },
                  score: { type: 'integer', minimum: 1, maximum: 5, description: 'Rating score (1-5)' },
                  review: { type: 'string', description: 'Optional text review' },
                },
                required: ['agent_id', 'score'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Rating submitted',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Reports ──
    '/v1/skills/{slug}/reports': {
      post: {
        operationId: 'reportSkill',
        summary: 'Report a skill',
        description: 'Flag a skill for review. Valid categories: malicious, broken, misleading, license, spam.',
        tags: ['Trust'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reporter_id: { type: 'string', description: 'Reporter identifier' },
                  category: {
                    type: 'string',
                    enum: ['malicious', 'broken', 'misleading', 'license', 'spam'],
                    description: 'Report category',
                  },
                  description: { type: 'string', description: 'Detailed report description' },
                },
                required: ['reporter_id', 'category', 'description'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Report submitted',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Audit Status ──
    '/v1/skills/{slug}/audit-status': {
      get: {
        operationId: 'getAuditStatus',
        summary: 'Audit pipeline status',
        description: 'Returns the current verification pipeline status for the latest version of a skill.',
        tags: ['Verification'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Audit pipeline status',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    version: { type: 'string', description: 'Semver of latest version' },
                    overall_status: { type: 'string', enum: ['pending', 'pass', 'fail', 'escalate'] },
                    stages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          stage: { type: 'string' },
                          status: { type: 'string' },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Verify ──
    '/v1/verify': {
      post: {
        operationId: 'verifySkillContent',
        summary: 'Verify skill content',
        description: 'Submit skill content for standalone verification without publishing. Runs the L1 manifest check and L2 static analysis pipeline.',
        tags: ['Verification'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string', description: 'Raw skill markdown content' },
                  manifest: { type: 'object', description: 'Skill manifest object' },
                  readme: { type: 'string', description: 'README content (optional)' },
                },
                required: ['content', 'manifest'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification results',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['pass', 'fail', 'escalate'] },
                    l1: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        score: { type: 'number' },
                        errors: { type: 'array', items: { type: 'string' } },
                      },
                    },
                    l2: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        status: { type: 'string' },
                        summary: { type: 'string' },
                        findings: { type: 'array', items: { $ref: '#/components/schemas/Finding' } },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Publishers ──
    '/v1/publishers': {
      post: {
        operationId: 'registerPublisher',
        summary: 'Register a publisher',
        description: 'Register a new publisher account. Typically called after GitHub OAuth authentication.',
        tags: ['Publishers'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  github_id: { type: 'string', description: 'GitHub user ID' },
                  display_name: { type: 'string', description: 'Display name' },
                  email: { type: 'string', format: 'email' },
                },
                required: ['github_id', 'display_name', 'email'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Publisher created',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    publisher: { $ref: '#/components/schemas/Publisher' },
                  },
                },
              },
            },
          },
          '200': {
            description: 'Publisher already exists (returned existing)',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    publisher: { $ref: '#/components/schemas/Publisher' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },

    // ── Auth ──
    '/auth/github': {
      get: {
        operationId: 'githubOAuthRedirect',
        summary: 'GitHub OAuth redirect',
        description: 'Initiates the GitHub OAuth flow. Redirects the user to GitHub for authorization.',
        tags: ['Auth'],
        responses: {
          '302': {
            description: 'Redirect to GitHub OAuth authorization page',
            headers: {
              Location: { schema: { type: 'string', format: 'uri' }, description: 'GitHub OAuth authorization URL' },
            },
          },
          '503': {
            description: 'GitHub OAuth not configured',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        operationId: 'getCurrentUser',
        summary: 'Current user info',
        description: 'Returns the authenticated publisher profile for the current JWT bearer token.',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Authenticated publisher info',
            headers: rateLimitHeaders,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    publisher: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        display_name: { type: 'string' },
                        github_id: { type: 'string' },
                        verified_at: { type: 'string', format: 'date-time', nullable: true },
                        trust_score: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
  },
};

// ── Swagger UI HTML ──

function swaggerHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Percival Labs Registry - API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; background: #fafafa; }
    .topbar { display: none !important; }
    .swagger-ui .info .title { font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${specUrl}',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset,
      ],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;
}

// ── Route Handler ──

export function openapiRoutes(): Hono {
  const app = new Hono();

  // GET /v1/openapi.json — Full OpenAPI spec
  app.get('/v1/openapi.json', (c) => {
    return c.json(spec);
  });

  // GET /docs — Swagger UI
  app.get('/docs', (c) => {
    return c.html(swaggerHtml('/v1/openapi.json'));
  });

  return app;
}

import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SaaS Multi-Tenant API',
    version: '1.0.0',
    description: 'Documentation for the SaaS Backend API',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/register-tenant': {
      post: {
        summary: 'Register a new Tenant and Admin User',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tenantName: { type: 'string', example: 'Acme Corp' },
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', example: 'john@acme.com' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tenant successfully registered' },
          400: { description: 'Email already exists' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login User',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@saas.com' },
                  password: { type: 'string', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Successful login, returns JWT tokens and User info' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/admin/dashboard': {
      get: {
        summary: 'Get Admin Dashboard Statistics',
        tags: ['Admin'],
        responses: {
          200: { description: 'Returns system stats and recent records' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden: Insufficient privileges' },
        },
      },
    },
    '/api/users': {
      get: {
        summary: 'Get all users in the current Tenant',
        tags: ['Users'],
        responses: {
          200: { description: 'List of users' },
        },
      },
      post: {
        summary: 'Create a new User in the Tenant',
        tags: ['Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Jane Doe' },
                  email: { type: 'string', example: 'jane@acme.com' },
                  password: { type: 'string', example: 'securepass' },
                  roleName: { type: 'string', example: 'user' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created' },
        },
      },
    },
    '/api/subscriptions': {
      get: {
        summary: 'Get all subscriptions for the current Tenant',
        tags: ['Subscriptions'],
        responses: {
          200: { description: 'List of active subscriptions' }
        }
      }
    }
  },
};

export const swaggerDocs = (app: Express, port: number | string) => {
  // Config Route
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  
  // JSON Route
  app.get('/api/docs-json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
};

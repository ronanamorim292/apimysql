import { Router } from 'express';
import { register, registerTenant, verifyEmail, login, logout, refreshToken, forgotPassword, resetPassword } from '../controllers/authController';
import { getUsers, createUser } from '../controllers/userController';
import { getTenants, createTenant } from '../controllers/tenantController';
import { getSubscriptions, createSubscription } from '../controllers/subscriptionController';
import { getAdminDashboardStats } from '../controllers/adminDashboardController';
import { handlePaymentApproved, handlePaymentCancelled, handlePaymentRenewed } from '../controllers/webhookController';
import { authenticate, requireRole, validatePermission } from '../middleware/auth';
import { enforceTenantIsolation } from '../middleware/tenantIsolation';
import { loginLimiter, apiLimiter } from '../middleware/rateLimiter';
import dynamicCrud from './dynamicCrud';

const router = Router();

// Rate limiter globally applied to API via router.use if you prefer, but we specify to sensitive operations right now.
router.use(apiLimiter);

// Auth Routes (Login has its own custom Brute force Limiter layered with API Limiter)
router.post('/auth/register', register);
router.post('/auth/register-tenant', registerTenant);
router.post('/auth/verify-email', verifyEmail);
router.post('/auth/login', loginLimiter, login);
router.post('/auth/logout', authenticate, logout);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.post('/auth/refresh-token', refreshToken);

// API Isolated Scopes 
// Users
router.get('/users', authenticate, enforceTenantIsolation, validatePermission('read', 'users'), getUsers);
router.post('/users', authenticate, enforceTenantIsolation, requireRole(['admin', 'manager']), createUser);

// Tenants
router.get('/tenants', authenticate, enforceTenantIsolation, getTenants);
router.post('/tenants', authenticate, enforceTenantIsolation, requireRole(['admin']), createTenant);

// Subscriptions
router.get('/subscriptions', authenticate, enforceTenantIsolation, getSubscriptions);
router.post('/subscriptions', authenticate, enforceTenantIsolation, requireRole(['admin']), createSubscription);

// Webhook Routes 
router.post('/webhooks/payment-approved', handlePaymentApproved);
router.post('/webhooks/payment-cancelled', handlePaymentCancelled);
router.post('/webhooks/payment-renewed', handlePaymentRenewed);

// Admin Dashboard Routes (Assuming this acts mostly globally for now, or isolate based on system tenant. Enforce carefully)
router.get('/admin/dashboard', authenticate, requireRole(['admin']), getAdminDashboardStats);

// 🚀 Dynamic CRUD Catch-all (Must be evaluated at the end or uniquely routed)
// This will automaticaly power endpoints like /api/data/customers, /api/data/orders, etc.
router.use('/data', authenticate, dynamicCrud);

export default router;

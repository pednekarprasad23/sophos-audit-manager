const express = require('express');
const session = require('express-session');
const path = require('path');
const fileUpload = require('express-fileupload');
const { initDb, getDb } = require('./db');
const {
    auditLogger,
    rateLimit,
    securityHeaders,
    sessionSecurity
} = require('./middleware/security');

const app = express();

// Initialize database connection
initDb().catch(err => {
    console.error('Failed to initialize database:', err);
});

// Trust proxy for rate limiting (when behind Cloudflare)
app.set('trust proxy', 1);

// Security headers (must be first)
app.use(securityHeaders);

// Rate limiting for login endpoint
app.use('/api/auth/login', rateLimit({ windowMs: 60000, max: 5 })); // 5 attempts per minute
app.use('/api/auth/register', rateLimit({ windowMs: 300000, max: 3 })); // 3 attempts per 5 minutes

// Session configuration with enhanced security
app.use(session({
    secret: process.env.SESSION_SECRET || 'sophos-audit-secret-key-2024-change-in-production',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, // HTTP for development, true for production with HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 3600000 // 1 hour
    }
}));

// Session security
app.use(sessionSecurity);

// Audit logging (log all requests)
app.use(auditLogger);

// Body parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// File upload with security
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    abortOnOriginalName: true,
    preserveExtension: true,
    useTempFiles: false,
    safeFileNames: true,
    compatibleWithUnixSockets: true
}));

// Make db connection available to routes
app.use((req, res, next) => {
    req.db = getDb();
    next();
});

// Routes
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Authentication Routes
const authRoutes = require('./routes/auth');
const siteRoutes = require('./routes/sites');
const firewallRoutes = require('./routes/firewalls');
const reportRoutes = require('./routes/reports');
const passwordRoutes = require('./routes/passwords');

app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/firewalls', firewallRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/passwords', passwordRoutes);

// Dashboard route
app.get('/dashboard', require('./middleware/auth').ensureAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Sites management
app.get('/sites', require('./middleware/auth').ensureAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'sites.html'));
});

// Firewalls management
app.get('/firewalls', require('./middleware/auth').ensureAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'firewalls.html'));
});

// Reports management
app.get('/reports', require('./middleware/auth').ensureAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reports.html'));
});

// Password manager
app.get('/passwords', require('./middleware/auth').ensureAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'passwords.html'));
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: req.db ? 'connected' : 'disconnected'
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('[ERROR]', new Date().toISOString(), err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Security features enabled: Audit logging, Rate limiting, Security headers`);
});

module.exports = app;
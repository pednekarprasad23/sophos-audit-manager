/**
 * Security middleware for enhanced protection
 */

// Audit logging middleware
function auditLogger(req, res, next) {
    const start = Date.now();
    const user = req.session?.username || 'anonymous';
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;

    // Log the request
    console.log(`[AUDIT] ${new Date().toISOString()} | User: ${user} | ${method} ${url} | IP: ${ip}`);

    // Capture response
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body) {
        const duration = Date.now() - start;
        console.log(`[AUDIT] Response: ${res.statusCode} | Duration: ${duration}ms`);
        return originalSend.call(this, body);
    };

    res.json = function(body) {
        const duration = Date.now() - start;
        console.log(`[AUDIT] Response: ${res.statusCode} | Duration: ${duration}ms`);
        return originalJson.call(this, body);
    };

    next();
}

// Rate limiting middleware (in-memory, use Redis for production)
const rateLimits = new Map();

function rateLimit(options = {}) {
    const windowMs = options.windowMs || 60000; // 1 minute default
    const maxRequests = options.max || 100; // 100 requests per window

    return function(req, res, next) {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${ip}:${req.route?.path || 'general'}`;
        const now = Date.now();

        if (!rateLimits.has(key)) {
            rateLimits.set(key, { count: 1, resetTime: now + windowMs });
        }

        const limit = rateLimits.get(key);

        // Check if window has expired
        if (now > limit.resetTime) {
            limit.count = 1;
            limit.resetTime = now + windowMs;
        } else {
            limit.count++;
        }

        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': Math.max(0, maxRequests - limit.count),
            'X-RateLimit-Reset': Math.ceil((limit.resetTime - now) / 1000)
        });

        if (limit.count > maxRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                retryAfter: Math.ceil((limit.resetTime - now) / 1000)
            });
        }

        next();
    };
}

// Security headers middleware
function securityHeaders(req, res, next) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (Feature Policy)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
}

// Session security middleware
function sessionSecurity(req, res, next) {
    // Add session IP check (optional - can be too restrictive)
    // const sessionIp = req.session.ip;
    // if (sessionIp && sessionIp !== req.ip) {
    //     req.session.destroy(() => res.status(401).json({ error: 'Session invalid' }));
    //     return;
    // }
    // req.session.ip = req.ip;

    next();
}

// CORS configuration (restrict to your domain)
function corsOptions(req, res, next) {
    const allowedOrigins = [
        'https://your-domain.com',
        'https://*.your-domain.com',
        'http://localhost:9005' // For development
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
}

module.exports = {
    auditLogger,
    rateLimit,
    securityHeaders,
    sessionSecurity,
    corsOptions
};
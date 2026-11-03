/**
 * Authentication middleware
 */

// Ensure user is authenticated
function ensureAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Check if user is admin
function isAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
}

// Check if user is admin or site manager
function canManageSites(req, res, next) {
    if (req.session && req.session.userId &&
        (req.session.role === 'admin' || req.session.role === 'site_manager')) {
        next();
    } else {
        res.status(403).json({ error: 'Insufficient permissions' });
    }
}

module.exports = {
    ensureAuth,
    isAdmin,
    canManageSites
};
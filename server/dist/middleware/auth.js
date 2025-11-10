"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAdmin = exports.requireAuth = void 0;
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};
exports.requireAuth = requireAuth;
const requireAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    const user = req.user;
    if (user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const optionalAuth = (req, res, next) => {
    // This middleware allows both authenticated and guest users
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map
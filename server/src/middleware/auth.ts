import { Request, Response, NextFunction } from 'express';
import { User } from '../types';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const user = req.user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // This middleware allows both authenticated and guest users
  next();
};
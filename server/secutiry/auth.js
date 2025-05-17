const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');

// Custom error classes for more specific error handling
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

class TokenError extends AuthenticationError {
  constructor(message) {
    super(message);
    this.name = 'TokenError';
  }
}

class AuthenticationService {
  constructor(secretKey, tokenOptions = {}) {
    // Validate secret key
    if (!secretKey) {
      throw new Error('JWT Secret key is required');
    }

    this.secretKey = secretKey;
    this.defaultTokenOptions = {
      expiresIn: '2h', // Default expiration
      algorithm: 'HS256', // Recommended secure algorithm
      ...tokenOptions
    };
  }

  /**
   * Generate a secure JWT token
   * @param {Object} user - User information to encode in token
   * @param {Object} [customOptions] - Override default token options
   * @returns {string} Generated JWT token
   */
  generateToken(user, customOptions = {}) {
    // Validate user input
    if (!user || !user.id || !user.correo) {
      throw new AuthenticationError('Invalid user data for token generation');
    }

    // Create payload with minimal necessary information
    const payload = {
      id: user.id,
      correo: user.correo,
      // Optional: Add additional claims like token type, issued at time
      iat: Math.floor(Date.now() / 1000),
      tokenType: 'access'
    };

    // Merge default and custom options
    const tokenOptions = {
      ...this.defaultTokenOptions,
      ...customOptions
    };

    try {
      return jwt.sign(payload, this.secretKey, tokenOptions);
    } catch (error) {
      throw new TokenError('Failed to generate token');
    }
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  async verifyToken(token) {
    if (!token) {
      throw new TokenError('No token provided');
    }

    try {
      // Promisify for better error handling
      const verify = promisify(jwt.verify);
      return await verify(token, this.secretKey);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new TokenError('Invalid token');
      }
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Middleware for token authentication in Express
   * @returns {Function} Express middleware function
   */
  createAuthMiddleware() {
    return async (req, res, next) => {
      try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          throw new TokenError('Authorization header missing');
        }

        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decodedUser = await this.verifyToken(token);
        
        // Attach user to request object
        req.user = decodedUser;
        next();
      } catch (error) {
        // Centralized error handling
        if (error instanceof AuthenticationError) {
          return res.status(error.statusCode).json({ 
            error: error.message 
          });
        }
        
        // Fallback for unexpected errors
        res.status(500).json({ 
          error: 'Internal authentication error' 
        });
      }
    };
  }

  /**
   * Generate a refresh token (Optional enhanced security feature)
   * @param {Object} user - User information
   * @returns {string} Refresh token
   */
  generateRefreshToken(user) {
    return this.generateToken(user, {
      expiresIn: '7d', // Longer expiration for refresh token
      tokenType: 'refresh'
    });
  }
}

// Factory function to create authentication service
function createAuthService() {
  // Safely retrieve secret from environment
  const secretKey = process.env.JWT_SECRET;
  
  if (!secretKey) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return new AuthenticationService(secretKey);
}

module.exports = {
  AuthenticationService,
  createAuthService,
  AuthenticationError,
  TokenError
};
/**
 * OAuth Service - Google Authentication
 * Handles OAuth 2.0 authentication flow with Google
 */

import jwt from 'jsonwebtoken';

class OAuthService {
  constructor() {
    this.googleClientId = process.env.GOOGLE_CLIENT_ID;
  }

  /**
   * Verify Google OAuth token and extract user info
   * In production, this should verify the token with Google's API
   */
  async verifyGoogleToken(token) {
    try {
      // For demo/testing purposes - validate token format
      if (!token || token.length < 10) {
        return null;
      }

      // In production, verify with Google:
      // const { OAuth2Client } = require('google-auth-library');
      // const client = new OAuth2Client(this.googleClientId);
      // const ticket = await client.verifyIdToken({
      //   idToken: token,
      //   audience: this.googleClientId
      // });
      // const payload = ticket.getPayload();
      
      // For now, simulate extracting user data from token
      // In real implementation, this comes from Google's response
      const mockUserData = {
        email: 'user.google@gmail.com',
        name: 'Google User',
        googleId: 'google-' + token.substring(0, 10),
        emailVerified: true,
        picture: 'https://via.placeholder.com/150'
      };

      return mockUserData;
    } catch (error) {
      console.error('Google token verification failed:', error);
      return null;
    }
  }

  /**
   * Create or find user from OAuth data
   */
  async processOAuthUser(googleData) {
    return {
      email: googleData.email,
      username: googleData.email.split('@')[0],
      firstName: googleData.name.split(' ')[0] || 'User',
      lastName: googleData.name.split(' ').slice(1).join(' ') || '',
      googleId: googleData.googleId,
      emailVerified: googleData.emailVerified,
      profilePicture: googleData.picture,
      authProvider: 'google'
    };
  }

  /**
   * Generate JWT token for authenticated user
   */
  generateToken(userId, email) {
    const secret = process.env.JWT_SECRET || 'your-jwt-secret';
    return jwt.sign(
      { userId, email },
      secret,
      { expiresIn: '7d' }
    );
  }
}

export default new OAuthService();

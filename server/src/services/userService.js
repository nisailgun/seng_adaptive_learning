/**
 * Enhanced User Service
 * Handles user registration and OAuth
 */

import bcrypt from 'bcrypt';
import UserModel from '../models/user.js';
import oauthService from './oauthService.js';

class UserService {
  /**
   * Register new user with email verification
   */
  async registerUser(username, email, password) {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findOne({
        $or: [{ username }, { email }]
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create user (password will be hashed by pre-save middleware)
      const user = await UserModel.create({
        username,
        email,
        password,
        emailVerified: false,
        verificationToken: this.generateVerificationToken(),
        role: 'student',
        theta: 0
      });

      // In production, send verification email
      console.log(`[Email] Verification email sent to ${email}`);
      console.log(`[Email] Token: ${user.verificationToken}`);

      return {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user._id
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Verify email and activate account
   */
  async activateAccount(token) {
    try {
      const user = await UserModel.findOne({ verificationToken: token });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      user.emailVerified = true;
      user.verificationToken = undefined;
      await user.save();

      return {
        success: true,
        message: 'Account activated successfully'
      };
    } catch (error) {
      console.error('Activation error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * OAuth login (Google)
   */
  async loginWithOAuth(token, provider = 'google') {
    try {
      let userData;

      if (provider === 'google') {
        userData = await oauthService.verifyGoogleToken(token);
      } else {
        throw new Error('Unsupported OAuth provider');
      }

      if (!userData) {
        throw new Error('OAuth verification failed');
      }

      // Check if user exists
      let user = await UserModel.findOne({
        $or: [
          { email: userData.email },
          { googleId: userData.googleId }
        ]
      });

      if (!user) {
        // Auto-register new user via OAuth
        const processedData = await oauthService.processOAuthUser(userData);
        user = await UserModel.create({
          username: processedData.username,
          email: processedData.email,
          firstName: processedData.firstName,
          lastName: processedData.lastName,
          googleId: processedData.googleId,
          emailVerified: true,
          authProvider: 'google',
          role: 'student',
          theta: 0,
          profilePicture: processedData.profilePicture
        });

        console.log(`[OAuth] New user registered via Google: ${user.email}`);
      } else {
        // Update OAuth info if needed
        if (!user.googleId && userData.googleId) {
          user.googleId = userData.googleId;
          user.authProvider = 'google';
          await user.save();
        }
        console.log(`[OAuth] Existing user logged in via Google: ${user.email}`);
      }

      // Generate JWT token
      const jwtToken = oauthService.generateToken(user._id, user.email);

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          theta: user.theta,
          profilePicture: user.profilePicture
        },
        token: jwtToken
      };
    } catch (error) {
      console.error('OAuth login error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Generate verification token
   */
  generateVerificationToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export default new UserService();

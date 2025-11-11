import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './database';
import { User as AppUser } from '../types';

// Extend Express User type
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AppUser {}
  }
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
   callbackURL:
        process.env.NODE_ENV === "production"
          ? "https://simri-beta.vercel.app/api/auth/google/callback"
          : "http://localhost:8000/api/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists with Google ID
    const existingGoogleUser = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [profile.id]
    );

    if (existingGoogleUser.rows.length > 0) {
      return done(null, existingGoogleUser.rows[0]);
    }

    // Check if user exists with same email
    const existingEmailUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [profile.emails?.[0]?.value]
    );

    if (existingEmailUser.rows.length > 0) {
      // Link Google account to existing email account
      const updatedUser = await pool.query(`
        UPDATE users 
        SET google_id = $1, 
            auth_provider = CASE 
              WHEN auth_provider = 'local' THEN 'local' 
              ELSE 'google' 
            END,
            avatar_url = COALESCE($2, avatar_url)
        WHERE id = $3
        RETURNING *
      `, [
        profile.id,
        profile.photos?.[0]?.value,
        existingEmailUser.rows[0].id
      ]);
      return done(null, updatedUser.rows[0]);
    }

    // Create new user if no existing account found
    const newUser = await pool.query(`
      INSERT INTO users (google_id, email, name, avatar_url, is_verified, auth_provider) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `, [
      profile.id,
      profile.emails?.[0]?.value,
      profile.displayName,
      profile.photos?.[0]?.value,
      true,
      'google'
    ]);

    return done(null, newUser.rows[0]);
  } catch (error) {
    return done(error as Error, undefined);
  }
}));

passport.serializeUser((user: AppUser, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0] as AppUser);
  } catch (error) {
    done(error as Error, undefined);
  }
});

export default passport;
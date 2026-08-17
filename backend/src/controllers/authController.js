const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, password_hash]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const userResult = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Return a generic success to prevent email enumeration
      return res.status(200).json({ message: 'If an account with that email exists, we have sent a verification code.' });
    }

    const user = userResult.rows[0];

    // Delete existing unused tokens for user to avoid spam
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

    await db.query(
      'INSERT INTO password_reset_tokens (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, otpHash, expiresAt]
    );

    // Send email via Vercel Serverless Function to bypass Render's SMTP block
    const isValidSmtpUser = process.env.SMTP_USER && process.env.SMTP_USER !== 'put_your_gmail_address_here@gmail.com';
    let errorMessage = '';

    if (isValidSmtpUser) {
      try {
        const baseUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'https://code-alpha-taskflow-app.vercel.app';
        const vercelApiUrl = baseUrl + '/api/send-otp';
        
        const response = await fetch(vercelApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: user.name,
            otp,
            smtpUser: process.env.SMTP_USER,
            smtpPass: process.env.SMTP_PASSWORD
          })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Vercel API returned ${response.status}: ${text}`);
        }
      } catch (emailError) {
        errorMessage = ` [Email Failed: ${emailError.message}]`;
        console.error('Failed to send OTP via Vercel API:', emailError.message);
      }
    } else {
      errorMessage = ` [Email Failed: SMTP_USER not configured in Render]`;
    }

    res.status(200).json({ 
      message: 'If an account with that email exists, we have sent a verification code.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error processing request' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }
    const user = userResult.rows[0];

    const tokenResult = await db.query(
      'SELECT id, otp_hash, expires_at, used_at, attempts FROM password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const tokenRecord = tokenResult.rows[0];
    
    // Check if used
    if (tokenRecord.used_at) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Check expiration
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Check attempts limit
    if (tokenRecord.attempts >= 5) {
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    // Verify OTP hash
    const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (inputHash !== tokenRecord.otp_hash) {
      // Increment attempts
      await db.query('UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1', [tokenRecord.id]);
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Mark as used
    await db.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [tokenRecord.id]);

    // Create short-lived reset authorization token
    const resetToken = jwt.sign({ id: user.id, reset: true }, process.env.JWT_SECRET, { expiresIn: '15m' });

    res.status(200).json({ resetToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset session.' });
    }

    if (!decoded.reset) {
      return res.status(400).json({ error: 'Invalid token type.' });
    }

    const userId = decoded.id;

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, userId]);

    // Cleanup old tokens
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error resetting password' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
};

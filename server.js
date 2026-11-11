require('dotenv').config();
const express = require('express');
const session = require('express-session');
const argon2 = require('argon2');
const { sendOTPEmail } = require('./utils/mailer');
const { requireAuth } = require('./middleware/authMiddleware');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Auth API Server is running!');
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, 
      secure: false, 
      maxAge: 1000 * 60 * 30,
    },
  })
);

// Sender
let dummyUser = {
  id: 1,
  username: 'teacher',
  email: 'user@example.com',
  passwordHash: '',
};

// Routes login info
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (username !== dummyUser.username) {
    return res.status(401).json({ message: '401 Login Failed' }); 
  }

  const isValidPassword = await argon2.verify(dummyUser.passwordHash, password);
  if (!isValidPassword) {
    return res.status(401).json({ message: '401 Login Failed' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  req.session.pendingOtp = {
    code: otp,
    expiresAt: expiresAt,
    attempts: 0,
    userId: dummyUser.id,
  };

  try {
    await sendOTPEmail(dummyUser.email, otp);
    return res.json({ message: 'OTP sent to your email. Please submit OTP.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send OTP via SMTP' });
  }
});

// Route to verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { otp } = req.body;
  const pendingOtp = req.session.pendingOtp;

  if (!pendingOtp) {
    return res.status(400).json({ message: 'No OTP session found. Please login again.' });
  }

  if (pendingOtp.attempts >= 3) {
    delete req.session.pendingOtp;
    return res.status(429).json({ message: 'Too many failed attempts. Please login again.' });
  }

  if (Date.now() > pendingOtp.expiresAt) {
    delete req.session.pendingOtp;
    return res.status(400).json({ message: 'OTP has expired.' });
  }

  if (otp !== pendingOtp.code) {
    pendingOtp.attempts += 1;
    return res.status(401).json({ message: 'Invalid OTP. Retry within limit.' });
  }

  req.session.isAuthenticated = true;
  req.session.userId = pendingOtp.userId;
  delete req.session.pendingOtp;

  return res.json({ message: 'Authentication Successful!' });
});

// Route get profile cookie
app.get('/api/profile', requireAuth, (req, res) => {
  res.json({
    message: 'Welcome to Protected Profile!',
    user: { id: req.session.userId, username: dummyUser.username },
  });
});

// Run server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  dummyUser.passwordHash = await argon2.hash('password123');
  console.log(`Server is running on http://localhost:${PORT}`);
});
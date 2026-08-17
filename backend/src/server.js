const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Security Middleware
app.use(helmet());

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later' }
});

// Socket.io setup for later phases
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json({ limit: '10kb' })); // Limit request body size

// Attach io to req for use in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Basic Health Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'TaskFlow API is running' });
});

// Import Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects'); 
const taskRoutes = require('./routes/tasks');
const notificationRoutes = require('./routes/notifications');

// Use Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const jwt = require('jsonwebtoken');
const db = require('./config/db');

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.user.id})`);
  
  // Join project rooms for targeted updates
  socket.on('join_project', async (projectId) => {
    try {
      // Verify user has access to this project
      const accessCheck = await db.query(
        `SELECT 1 FROM projects p
         LEFT JOIN project_members pm ON p.id = pm.project_id
         WHERE p.id = $1 AND (p.created_by = $2 OR pm.user_id = $2)`,
        [projectId, socket.user.id]
      );
      
      if (accessCheck.rows.length > 0) {
        socket.join(`project_${projectId}`);
        console.log(`Socket ${socket.id} joined room project_${projectId}`);
      } else {
        console.log(`Socket ${socket.id} denied access to room project_${projectId}`);
      }
    } catch (error) {
      console.error('Socket join project error:', error);
    }
  });

  socket.on('leave_project', (projectId) => {
    socket.leave(`project_${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const runMigrations = require('./migrate');

const PORT = process.env.PORT || 5000;

runMigrations().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const questionsRoutes = require('./routes/questions');
const examsRoutes = require('./routes/exams');
const reviewsRoutes = require('./routes/reviews');
const tagsRoutes = require('./routes/tags');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EQMS (Professional Certification Exam Question Management Platform)',
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 EQMS Backend Server running on http://localhost:${PORT}`);
  console.log(`📚 API Base: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});

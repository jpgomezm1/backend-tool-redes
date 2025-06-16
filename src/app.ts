import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import publicationsRoutes from './routes/publications';
import metricsRoutes from './routes/metrics';
import plannedContentRoutes from './routes/plannedContent';
import referentsRoutes from './routes/referents';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración específica de CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://172.22.144.1:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware adicional para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/publications', publicationsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/planned-content', plannedContentRoutes);
app.use('/api/referents', referentsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'TikTok Analytics API is running!',
    cors: 'enabled'
  });
});

// Test endpoint para verificar CORS
app.get('/api/test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.get('Origin'),
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    requestedUrl: req.originalUrl,
    availableRoutes: [
      'GET /health',
      'GET /api/test',
      'GET /api/publications',
      'POST /api/publications',
      'GET /api/analytics/overview',
      'GET /api/planned-content',
      'GET /api/referents'
    ]
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 TikTok Analytics API ready!`);
  console.log(`🔗 Available at: http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 CORS test: http://localhost:${PORT}/api/test`);
  console.log(`🌐 CORS enabled for: localhost:3000, localhost:5173`);
});

export default app;
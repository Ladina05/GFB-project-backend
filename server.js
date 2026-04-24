const express = require('express');
const cors = require('cors');
require('dotenv').config();

const articleRoutes = require('./src/routes/articleRoutes');
const wilsonRoutes = require('./src/routes/wilsonRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/articles', articleRoutes);
app.use('/api/wilson', wilsonRoutes);

// Route test
app.get('/', (req, res) => {
  res.json({
    message: '🎓 API GFB - Modèle de Wilson',
    version: '1.0.0',
    endpoints: {
      articles: '/api/articles',
      wilson: '/api/wilson',
    },
  });
});

// Gestion erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erreur serveur interne' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
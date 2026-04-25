const express = require('express');
const cors = require('cors');
require('dotenv').config();

const articleRoutes = require('./src/routes/articleRoutes');
const wilsonRoutes = require('./src/routes/wilsonRoutes');
const irregulierRoutes = require('./src/routes/irregulierRoutes'); // NOUVEAU

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/articles', articleRoutes);
app.use('/api/wilson', wilsonRoutes);
app.use('/api/irregulier', irregulierRoutes); // NOUVEAU

app.get('/', (req, res) => {
  res.json({
    message: '🎓 API GFB - Modèle de Wilson',
    version: '2.0.0',
    endpoints: {
      articles: '/api/articles',
      wilson: '/api/wilson',
      irregulier: '/api/irregulier',
    },
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erreur serveur interne' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
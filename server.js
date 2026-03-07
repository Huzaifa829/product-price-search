const express = require('express');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SERP_API_KEY;

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  }),
);

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/search', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Search API
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Product name is required' });
  }

  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_shopping',
        q: query,
        api_key: API_KEY,
      },
    });

    const results = response.data.shopping_results || [];

    const products = results.map((item) => ({
      title: item.title,
      price: item.price,
      shop: item.source,
      rating: item.rating,
      reviews: item.reviews,
      condition: item.second_hand_condition,
      delivery: item.delivery,
      image: item.thumbnail,
      link: item.product_link,
    }));

    res.json(products);
  } catch (error) {
    console.error('API ERROR:', error.message);
    res.status(500).json({ error: 'Failed to fetch product data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

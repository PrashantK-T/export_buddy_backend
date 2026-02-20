const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();

/* =======================
   CONFIG
======================= */
const PORT = process.env.PORT || 8001;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'import_buddy';

/* =======================
   MIDDLEWARE
======================= */

const allowedOrigins = [
  "https://import-buddy.vercel.app",
  "https://import-buddy-backend.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server calls (Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));



app.use(express.json());

/* =======================
   DATABASE
======================= */
let db;
const client = new MongoClient(MONGO_URL);

async function connectDB() {
  try {
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');

    await seedProducts();
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/* =======================
   SEED PRODUCTS
======================= */
async function seedProducts() {
  try {
    const collection = db.collection('products');
    const count = await collection.countDocuments();

    if (count > 0) {
      console.log(`ℹ️ Products already exist (${count})`);
      return;
    }

    const products = [
      { id: "p1", name: "Smartphones", category: "Electronics", description: "Latest Android and iOS smartphones", image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500", origin_country: "China" },
      { id: "p2", name: "Wireless Earbuds", category: "Electronics", description: "Premium earbuds with noise cancellation", image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500", origin_country: "China" },
      { id: "p3", name: "Smartwatches", category: "Electronics", description: "Fitness and health smartwatches", image_url: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500", origin_country: "China" },
      { id: "p4", name: "LED TVs", category: "Electronics", description: "4K & 8K Smart TVs", image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500", origin_country: "China" },
      { id: "p5", name: "Power Banks", category: "Electronics", description: "High capacity power banks", image_url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500", origin_country: "China" },

      { id: "p6", name: "Men's Casual Wear", category: "Fashion", description: "Casual clothing for men", image_url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?w=500", origin_country: "China" },
      { id: "p7", name: "Women's Fashion", category: "Fashion", description: "Latest women fashion", image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500", origin_country: "China" },

      { id: "p8", name: "Kitchen Appliances", category: "Home & Kitchen", description: "Modern kitchen appliances", image_url: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=500", origin_country: "China" },
      { id: "p9", name: "Home Decor", category: "Home & Kitchen", description: "Decorative home items", image_url: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=500", origin_country: "China" },

      { id: "p10", name: "Industrial Machinery", category: "Industrial", description: "Heavy industrial machines", image_url: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=500", origin_country: "China" }
    ];

    await collection.insertMany(products);
    console.log(`✅ Seeded ${products.length} products`);
  } catch (err) {
    console.error('❌ Product seeding failed:', err.message);
  }
}

/* =======================
   ROUTES
======================= */
app.get('/api', (req, res) => {
  res.json({ message: 'Import Buddy API is running' });
});

app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};

    const products = await db
      .collection('products')
      .find(query, { projection: { _id: 0 } })
      .toArray();

    res.json(products);
  } catch {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const q = req.query.q || '';

    if (!q) return res.json([]);

    const products = await db.collection('products')
      .find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } }
        ]
      }, { projection: { _id: 0 } })
      .toArray();

    res.json(products);
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.collection('products').distinct('category');
    res.json({ categories });
  } catch {
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

app.post('/api/inquiries', async (req, res) => {
  try {
    const inquiry = {
      ...req.body,
      created_at: new Date()
    };

    const result = await db.collection('inquiries').insertOne(inquiry);

    res.json({
      success: true,
      inquiry_id: result.insertedId.toString()
    });
  } catch {
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

/* =======================
   SHUTDOWN
======================= */
process.on('SIGINT', async () => {
  await client.close();
  console.log('🛑 MongoDB connection closed');
  process.exit(0);
});

/* =======================
   START SERVER
======================= */
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});

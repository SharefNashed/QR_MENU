require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');

const Shop = require('./models/Shop');
const User = require('./models/User');
const Category = require('./models/Category');
const Item = require('./models/Item');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// ============ AUTH MIDDLEWARE ============
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Shop owner middleware - checks if user owns the shop
const checkShopOwner = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.shopSlug });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    if (shop.ownerId.toString() !== req.user.userId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized for this shop' });
    }

    req.shop = shop;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Super admin middleware
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// ============ AUTH ROUTES ============

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = new User({ email, password, name, role: 'shop_owner' });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's shop if they own one
    const shop = await Shop.findOne({ ownerId: user._id });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
      shop: shop ? { slug: shop.slug, name: shop.name } : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    const shop = await Shop.findOne({ ownerId: user._id });

    res.json({
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
      shop: shop ? { slug: shop.slug, name: shop.name, logo: shop.logo } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============ SHOP ROUTES (PUBLIC) ============

// Get shop by slug (public)
app.get('/api/shops/:shopSlug', async (req, res) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.shopSlug, isActive: true });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json({
      id: shop._id,
      slug: shop.slug,
      name: shop.name,
      logo: shop.logo,
      settings: shop.settings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get shop' });
  }
});

// Get shop menu (public)
app.get('/api/shops/:shopSlug/menu', async (req, res) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.shopSlug, isActive: true });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const categories = await Category.find({ shopId: shop._id }).sort({ order: 1 });
    const items = await Item.find({ shopId: shop._id });

    res.json({
      shop: {
        id: shop._id,
        slug: shop.slug,
        name: shop.name,
        logo: shop.logo,
        settings: shop.settings
      },
      categories: categories.map(c => ({
        id: c._id.toString(),
        name: c.name,
        icon: c.icon,
        order: c.order
      })),
      items: items.map(i => ({
        id: i._id.toString(),
        categoryId: i.categoryId.toString(),
        name: i.name,
        description: i.description,
        price: i.price,
        image: i.image,
        available: i.available
      }))
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// ============ SHOP ADMIN ROUTES (PROTECTED) ============

// Create category
app.post('/api/shops/:shopSlug/categories', authenticateToken, checkShopOwner, async (req, res) => {
  try {
    const count = await Category.countDocuments({ shopId: req.shop._id });
    const category = new Category({
      shopId: req.shop._id,
      name: req.body.name,
      icon: req.body.icon || '📋',
      order: count + 1
    });
    await category.save();

    res.status(201).json({
      id: category._id.toString(),
      name: category.name,
      icon: category.icon,
      order: category.order
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
app.put('/api/shops/:shopSlug/categories/:id', authenticateToken, checkShopOwner, async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      { name: req.body.name, icon: req.body.icon },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      id: category._id.toString(),
      name: category.name,
      icon: category.icon,
      order: category.order
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
app.delete('/api/shops/:shopSlug/categories/:id', authenticateToken, checkShopOwner, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await Item.deleteMany({ categoryId: req.params.id, shopId: req.shop._id });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Create item
app.post('/api/shops/:shopSlug/items', authenticateToken, checkShopOwner, async (req, res) => {
  try {
    const item = new Item({
      shopId: req.shop._id,
      categoryId: req.body.categoryId,
      name: req.body.name,
      description: req.body.description || '',
      price: parseFloat(req.body.price) || 0,
      image: req.body.image || '',
      available: req.body.available !== false
    });
    await item.save();

    res.status(201).json({
      id: item._id.toString(),
      categoryId: item.categoryId.toString(),
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      available: item.available
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
app.put('/api/shops/:shopSlug/items/:id', authenticateToken, checkShopOwner, async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      categoryId: req.body.categoryId,
      image: req.body.image,
      available: req.body.available
    };

    if (req.body.price !== undefined) {
      updateData.price = parseFloat(req.body.price);
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      updateData,
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      id: item._id.toString(),
      categoryId: item.categoryId.toString(),
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      available: item.available
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
app.delete('/api/shops/:shopSlug/items/:id', authenticateToken, checkShopOwner, async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Update shop settings
app.put('/api/shops/:shopSlug/settings', authenticateToken, checkShopOwner, async (req, res) => {
  try {
    const shop = await Shop.findOneAndUpdate(
      { _id: req.shop._id },
      {
        name: req.body.name || req.shop.name,
        logo: req.body.logo || req.shop.logo,
        settings: { ...req.shop.settings, ...req.body.settings }
      },
      { new: true }
    );

    res.json({
      id: shop._id,
      slug: shop.slug,
      name: shop.name,
      logo: shop.logo,
      settings: shop.settings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

// ============ IMAGE UPLOAD ============
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'qr-menu',
      resource_type: 'image'
    });

    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ============ SUPER ADMIN ROUTES ============

// List all shops
app.get('/api/super-admin/shops', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const shops = await Shop.find().populate('ownerId', 'name email');
    res.json(shops.map(s => ({
      id: s._id,
      slug: s.slug,
      name: s.name,
      logo: s.logo,
      isActive: s.isActive,
      owner: s.ownerId ? { name: s.ownerId.name, email: s.ownerId.email } : null,
      createdAt: s.createdAt
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get shops' });
  }
});

// Create new shop
app.post('/api/super-admin/shops', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { slug, name, ownerEmail, ownerName, ownerPassword } = req.body;

    // Check if slug exists
    const existingShop = await Shop.findOne({ slug });
    if (existingShop) {
      return res.status(400).json({ error: 'Shop slug already exists' });
    }

    // Check if user exists or create new one
    let user = await User.findOne({ email: ownerEmail });
    if (!user) {
      user = new User({
        email: ownerEmail,
        password: ownerPassword || 'changeme123',
        name: ownerName || 'Shop Owner',
        role: 'shop_owner'
      });
      await user.save();
    }

    // Create shop
    const shop = new Shop({
      slug,
      name,
      ownerId: user._id
    });
    await shop.save();

    res.status(201).json({
      id: shop._id,
      slug: shop.slug,
      name: shop.name,
      owner: { email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({ error: 'Failed to create shop' });
  }
});

// Update shop (name, logo)
app.put('/api/super-admin/shops/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, logo } = req.body;

    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { name, logo },
      { new: true }
    );

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json({
      id: shop._id,
      slug: shop.slug,
      name: shop.name,
      logo: shop.logo
    });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

// Toggle shop active status
app.patch('/api/super-admin/shops/:id/toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    shop.isActive = !shop.isActive;
    await shop.save();

    res.json({ id: shop._id, isActive: shop.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle shop status' });
  }
});

// Delete shop
app.delete('/api/super-admin/shops/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Delete all shop data
    await Category.deleteMany({ shopId: shop._id });
    await Item.deleteMany({ shopId: shop._id });

    res.json({ message: 'Shop deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shop' });
  }
});

// List all users
app.get('/api/super-admin/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 QR Menu Server running on http://localhost:${PORT}`);
});

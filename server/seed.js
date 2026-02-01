 require('dotenv').config();
const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const User = require('./models/User');
const Category = require('./models/Category');
const Item = require('./models/Item');

// Sample data for two shops
const shopsData = [
    {
        slug: 'espresso-shots',
        name: "Espresso Shot's",
        ownerEmail: 'espresso@example.com',
        ownerPassword: 'espresso123',
        ownerName: 'Espresso Owner',
        categories: [
            { name: 'Hot Drinks', icon: '☕', order: 1 },
            { name: 'Cold Drinks', icon: '🧊', order: 2 },
            { name: 'Pastries', icon: '🥐', order: 3 }
        ],
        items: [
            { category: 'Hot Drinks', name: 'Espresso', description: 'Rich and bold single shot', price: 3.50 },
            { category: 'Hot Drinks', name: 'Cappuccino', description: 'Espresso with steamed milk and foam', price: 4.50 },
            { category: 'Hot Drinks', name: 'Latte', description: 'Smooth espresso with creamy milk', price: 4.75 },
            { category: 'Hot Drinks', name: 'Turkish Coffee', description: 'Strong traditional coffee', price: 4.00 },
            { category: 'Cold Drinks', name: 'Iced Latte', description: 'Chilled espresso with cold milk', price: 5.00 },
            { category: 'Cold Drinks', name: 'Cold Brew', description: 'Slow-steeped for 20 hours', price: 4.50 },
            { category: 'Pastries', name: 'Butter Croissant', description: 'Flaky French croissant', price: 3.25 },
            { category: 'Pastries', name: 'Chocolate Muffin', description: 'Rich chocolate muffin', price: 3.50 }
        ]
    },
    {
        slug: 'coffee-kings',
        name: 'Coffee Kings',
        ownerEmail: 'kings@example.com',
        ownerPassword: 'kings123',
        ownerName: 'Coffee Kings Owner',
        categories: [
            { name: 'Specialty Coffee', icon: '👑', order: 1 },
            { name: 'Iced Beverages', icon: '❄️', order: 2 },
            { name: 'Food', icon: '🍔', order: 3 }
        ],
        items: [
            { category: 'Specialty Coffee', name: 'Royal Espresso', description: 'Double shot of premium beans', price: 4.00 },
            { category: 'Specialty Coffee', name: 'King Latte', description: 'Our signature creamy latte', price: 5.50 },
            { category: 'Specialty Coffee', name: 'Mocha Supreme', description: 'Chocolate meets espresso', price: 5.75 },
            { category: 'Iced Beverages', name: 'Frozen Caramel', description: 'Blended caramel coffee', price: 6.00 },
            { category: 'Iced Beverages', name: 'Iced Americano', description: 'Classic cold americano', price: 4.00 },
            { category: 'Food', name: 'Royal Sandwich', description: 'Turkey, cheese, and veggies', price: 8.50 },
            { category: 'Food', name: 'Caesar Salad', description: 'Fresh romaine with dressing', price: 7.50 }
        ]
    }
];

async function seed() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Shop.deleteMany({});
        await Category.deleteMany({});
        await Item.deleteMany({});

        // Create super admin
        console.log('👤 Creating super admin...');
        const superAdmin = new User({
            email: 'admin@brifsoft.com',
            password: 'admin123',
            name: 'Super Admin',
            role: 'super_admin'
        });
        await superAdmin.save();
        console.log('   Super Admin: admin@brifsoft.com / admin123');

        // Create shops
        for (const shopData of shopsData) {
            console.log(`\n🏪 Creating shop: ${shopData.name}`);

            // Create owner
            const owner = new User({
                email: shopData.ownerEmail,
                password: shopData.ownerPassword,
                name: shopData.ownerName,
                role: 'shop_owner'
            });
            await owner.save();
            console.log(`   Owner: ${shopData.ownerEmail} / ${shopData.ownerPassword}`);

            // Create shop
            const shop = new Shop({
                slug: shopData.slug,
                name: shopData.name,
                ownerId: owner._id
            });
            await shop.save();
            console.log(`   URL: /${shopData.slug}`);

            // Create categories
            const categoryMap = {};
            for (const catData of shopData.categories) {
                const category = new Category({
                    shopId: shop._id,
                    name: catData.name,
                    icon: catData.icon,
                    order: catData.order
                });
                await category.save();
                categoryMap[catData.name] = category._id;
            }
            console.log(`   Created ${shopData.categories.length} categories`);

            // Create items
            for (const itemData of shopData.items) {
                const item = new Item({
                    shopId: shop._id,
                    categoryId: categoryMap[itemData.category],
                    name: itemData.name,
                    description: itemData.description,
                    price: itemData.price,
                    available: true
                });
                await item.save();
            }
            console.log(`   Created ${shopData.items.length} menu items`);
        }

        console.log('\n✅ Database seeded successfully!');
        console.log('\n📋 Summary:');
        console.log('   Super Admin: admin@brifsoft.com / admin123');
        console.log('   Shop 1: /espresso-shots (espresso@example.com / espresso123)');
        console.log('   Shop 2: /coffee-kings (kings@example.com / kings123)');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seed();

import pool from '../config/database';

const sampleCategories = [
  {
    name: 'Gifts for Her',
    slug: 'gifts-for-her',
    description: 'Beautiful and thoughtful gifts for the special women in your life',
    is_active: true
  },
  {
    name: 'Gifts for Him',
    slug: 'gifts-for-him',
    description: 'Perfect gifts for men of all ages and interests',
    is_active: true
  },
  {
    name: 'Birthday Gifts',
    slug: 'birthday-gifts',
    description: 'Make every birthday memorable with our special collection',
    is_active: true
  },
  {
    name: 'Wedding Gifts',
    slug: 'wedding-gifts',
    description: 'Celebrate love with our curated wedding gift collection',
    is_active: true
  },
  {
    name: 'Personalized Gifts',
    slug: 'personalized-gifts',
    description: 'Custom made gifts with personal touch',
    is_active: true
  }
];

const sampleProducts = [
  {
    name: 'Personalized Photo Frame',
    slug: 'personalized-photo-frame',
    description: 'Beautiful wooden photo frame with custom engraving. Perfect for preserving precious memories.',
    short_description: 'Custom engraved wooden photo frame',
    sku: 'PGF-001',
    price: 899,
    discount_price: 749,
    stock_quantity: 50,
    images: ['https://images.unsplash.com/photo-1757651885829-3ecc09b21382?q=80&w=2613&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1757285398769-31a5021afdcd?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
    is_featured: true,
    is_active: true,
    weight: 0.5,
    dimensions: { length: 20, width: 15, height: 2 },
    tags: ['personalized', 'photo', 'frame', 'wooden'],
    meta_title: 'Custom Photo Frame - Personalized Gift',
    meta_description: 'Beautiful wooden photo frame with custom engraving for your precious memories'
  },
  {
    name: 'Luxury Chocolate Box',
    slug: 'luxury-chocolate-box',
    description: 'Premium assorted chocolates in an elegant gift box. Contains 20 pieces of handcrafted chocolates.',
    short_description: 'Premium assorted chocolates gift box',
    sku: 'LCB-001',
    price: 1299,
    stock_quantity: 30,
    images: ['https://images.unsplash.com/photo-1757366224288-076dfeb5ef8e?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1756745678835-00315541d465?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
    is_featured: true,
    is_active: true,
    weight: 0.8,
    dimensions: { length: 25, width: 20, height: 5 },
    tags: ['chocolate', 'luxury', 'gift', 'sweet'],
    meta_title: 'Luxury Chocolate Gift Box',
    meta_description: 'Premium assorted chocolates in elegant gift box perfect for any occasion'
  },
  {
    name: 'Customized Mug',
    slug: 'customized-mug',
    description: 'High-quality ceramic mug with your custom design or message. Dishwasher and microwave safe.',
    short_description: 'Custom design ceramic mug',
    sku: 'CM-001',
    price: 399,
    discount_price: 299,
    stock_quantity: 100,
    images: ['https://images.unsplash.com/photo-1757071018435-49dae03ed383?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1756747840159-f81cc8607ece?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
    is_featured: false,
    is_active: true,
    weight: 0.3,
    dimensions: { length: 12, width: 9, height: 10 },
    tags: ['mug', 'ceramic', 'custom', 'personalized'],
    meta_title: 'Custom Ceramic Mug - Personalized Gift',
    meta_description: 'High-quality ceramic mug with custom design perfect for daily use'
  },
  {
    name: 'Scented Candle Set',
    slug: 'scented-candle-set',
    description: 'Set of 3 premium scented candles with relaxing fragrances. Made from natural soy wax.',
    short_description: 'Premium scented candle set',
    sku: 'SCS-001',
    price: 799,
    stock_quantity: 40,
    images: ['https://images.unsplash.com/photo-1701410782370-18c6619cbd53?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1755669933959-377ab117bb8a?q=80&w=1337&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
    is_featured: false,
    is_active: true,
    weight: 1.2,
    dimensions: { length: 15, width: 15, height: 8 },
    tags: ['candles', 'scented', 'soy', 'relaxing'],
    meta_title: 'Premium Scented Candle Set',
    meta_description: 'Set of 3 premium scented candles made from natural soy wax'
  },
  {
    name: 'Jewelry Box',
    slug: 'jewelry-box',
    description: 'Elegant jewelry box with velvet interior and multiple compartments. Perfect for organizing jewelry.',
    short_description: 'Elegant jewelry organizer box',
    sku: 'JB-001',
    price: 1599,
    discount_price: 1299,
    stock_quantity: 25,
    images: ['https://images.unsplash.com/photo-1608716619640-83dda66aaad1?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1756729927770-a42e4f8c7d86?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
    is_featured: true,
    is_active: true,
    weight: 1.5,
    dimensions: { length: 25, width: 15, height: 10 },
    tags: ['jewelry', 'box', 'organizer', 'elegant'],
    meta_title: 'Elegant Jewelry Box - Perfect Gift',
    meta_description: 'Beautiful jewelry box with velvet interior and multiple compartments'
  }
];

export async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting database seeding...');
    
    // Seeder will only add new data, not delete existing data
    console.log('📝 Adding sample data (preserving existing data)...');
    
    // Seed categories (skip existing ones)
    console.log('📂 Adding categories (skipping existing ones)...');
    const categoryQueries = sampleCategories.map(category => 
      client.query(`
        INSERT INTO categories (name, slug, description, is_active) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (slug) DO UPDATE SET 
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING id
      `, [category.name, category.slug, category.description, category.is_active])
    );
    
    const categoryResults = await Promise.all(categoryQueries);
    const categoryIds = categoryResults.map(result => result.rows[0].id);
    
    // Add products (update existing ones based on SKU)
    console.log('🎁 Adding/updating products...');
    for (const product of sampleProducts) {
      const randomCategoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];
      
      await client.query(`
        INSERT INTO products (
          name, slug, description, short_description, sku, price, discount_price,
          stock_quantity, category_id, images, is_featured, is_active,
          weight, dimensions, tags, meta_title, meta_description
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (sku) DO UPDATE SET 
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          short_description = EXCLUDED.short_description,
          price = EXCLUDED.price,
          discount_price = EXCLUDED.discount_price,
          stock_quantity = EXCLUDED.stock_quantity,
          category_id = EXCLUDED.category_id,
          images = EXCLUDED.images,
          is_featured = EXCLUDED.is_featured,
          is_active = EXCLUDED.is_active,
          weight = EXCLUDED.weight,
          dimensions = EXCLUDED.dimensions,
          tags = EXCLUDED.tags,
          meta_title = EXCLUDED.meta_title,
          meta_description = EXCLUDED.meta_description,
          updated_at = NOW()
      `, [
        product.name, product.slug, product.description, product.short_description,
        product.sku, product.price, product.discount_price, product.stock_quantity,
        randomCategoryId, JSON.stringify(product.images), product.is_featured,
        product.is_active, product.weight, JSON.stringify(product.dimensions),
        product.tags, product.meta_title, product.meta_description
      ]);
    }
    
    // Create a test customer user (only if doesn't exist)
    console.log('👤 Ensuring test customer user exists...');
    await client.query(`
      INSERT INTO users (email, name, role, is_verified, auth_provider, google_id) 
      VALUES ('test@example.com', 'Test User', 'customer', true, 'google', 'google-test-id-123')
      ON CONFLICT (email) DO NOTHING
    `);
    
    // Create an admin user with email/password authentication
    console.log('👨‍💼 Creating admin user...');
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await client.query(`
      INSERT INTO users (email, name, password_hash, role, is_verified, auth_provider) 
      VALUES ('admin@simri.com', 'Admin User', $1, 'admin', true, 'local')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = 'admin',
        is_verified = true,
        updated_at = NOW()
    `, [adminPassword]);
    
    await client.query('COMMIT');
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
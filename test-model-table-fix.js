/**
 * Test for Model.getTable() bug fix
 * 
 * This test verifies that static table property is correctly read
 */

const { Model } = require('./dist');

// Test 1: Static property
class User extends Model {
  static table = 'users';
}

// Test 2: Protected instance property (old style)
class Product extends Model {
  constructor(attributes = {}) {
    super(attributes);
    this.table = 'products';
  }
}

// Test 3: No table specified (should use class name)
class BlogPost extends Model {
}

// Test 4: Static getter
class CustomTable extends Model {
  static get table() {
    return 'custom_tables';
  }
}

async function testGetTable() {
  console.log('🧪 Testing Model.getTable() Fix\n');
  
  // Debug: Check if static property exists
  console.log('🔍 Debug Info:');
  console.log(`User.table = ${User.table}`);
  console.log(`new User().constructor.table = ${new User().constructor.table}`);
  console.log(`new User().constructor.name = ${new User().constructor.name}`);
  console.log('');
  
  // Test 1: Static property
  const user = new User();
  const userTable = user.getTable();
  console.log(`✓ User (static property):     ${userTable}`);
  if (userTable !== 'users') {
    console.error(`  ❌ Expected 'users', got '${userTable}'`);
  }
  
  // Test 2: Instance property
  const product = new Product();
  const productTable = product.getTable();
  console.log(`✓ Product (instance property): ${productTable}`);
  if (productTable !== 'products') {
    console.error(`  ❌ Expected 'products', got '${productTable}'`);
  }
  
  // Test 3: Default (class name)
  const blogPost = new BlogPost();
  const blogPostTable = blogPost.getTable();
  console.log(`✓ BlogPost (default):          ${blogPostTable}`);
  if (blogPostTable !== 'blog_posts') {
    console.error(`  ❌ Expected 'blog_posts', got '${blogPostTable}'`);
  }
  
  // Test 4: Static getter
  const custom = new CustomTable();
  const customTable = custom.getTable();
  console.log(`✓ CustomTable (static getter): ${customTable}`);
  if (customTable !== 'custom_tables') {
    console.error(`  ❌ Expected 'custom_tables', got '${customTable}'`);
  }
  
  console.log('\n📋 Priority order:');
  console.log('  1. Instance property (this.table)');
  console.log('  2. Static property (constructor.table)');
  console.log('  3. Class name (snake_cased + pluralized)\n');
}

testGetTable().catch(console.error);

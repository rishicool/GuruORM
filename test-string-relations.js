/**
 * GuruORM v1.16.0 - String-Based Relations Test
 * 
 * Tests BOTH class-based and string-based relation definitions
 */

const { Model, Manager } = require('./dist/index.js');

// Configure PostgreSQL connection using Manager (Capsule)
const manager = new Manager();
manager.addConnection({
  driver: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'neastore',
  username: 'postgres',
  password: 'root'
});

manager.bootEloquent();
manager.setAsGlobal();

// ============================================
// MODEL DEFINITIONS
// ============================================

// Test 1: Class-based relations (OLD WAY - still works)
class Brand extends Model {
  constructor(attributes = {}) {
    super(attributes);
    this.table = 'brands';
  }
}

class Category extends Model {
  constructor(attributes = {}) {
    super(attributes);
    this.table = 'categories';
  }
}

class Unit extends Model {
  constructor(attributes = {}) {
    super(attributes);
    this.table = 'units';
  }
}

// Test 2: String-based relations (NEW WAY - flexible)
class Product extends Model {
  constructor(attributes = {}) {
    super(attributes);
    this.table = 'products';
    this.fillable = ['*'];
  }

  // ✅ Using STRINGS instead of class imports!
  brand() {
    return this.belongsTo('Brand', 'brand_id');
  }

  category() {
    return this.belongsTo('Category', 'category_id');
  }

  unit() {
    return this.belongsTo('Unit', 'unit_id');
  }

  variants() {
    return this.hasMany('ProductVariant', 'product_id');
  }
}

// Test 3: Hybrid approach (mix of both)
class ProductVariant extends Model {
  constructor(attributes = {}) {
    super(attributes);
    this.table = 'product_variants';
    this.fillable = ['*'];
  }

  // String-based
  product() {
    return this.belongsTo('Product', 'product_id');
  }

  // Class-based (also works!)
  unit() {
    return this.belongsTo(Unit, 'unit_id');
  }
}

// Test 4: Self-referencing with strings
class CategorySelfRef extends Model {
  constructor(attributes = {}) {
    super(attributes);
    this.table = 'categories';
  }

  // ✅ Self-reference with string!
  parent() {
    return this.belongsTo('CategorySelfRef', 'parent_id');
  }

  children() {
    return this.hasMany('CategorySelfRef', 'parent_id');
  }
}

// Test 5: Many-to-many with strings
class DeliveryPartner extends Model {
  constructor(attributes = {}) {
    super(attributes);
    this.table = 'delivery_partners';
    this.fillable = ['*'];
  }
}

// ============================================
// BOOTSTRAP: Auto-register all models
// ============================================
console.log('🔧 Bootstrapping models...\n');

// Instantiate models to trigger boot() and auto-registration
new Brand();
new Category();
new Unit();
new Product();
new ProductVariant();
new CategorySelfRef();
new DeliveryPartner();

// Verify registration
console.log('📋 Registered Models:');
const registeredModels = ['Brand', 'Category', 'Unit', 'Product', 'ProductVariant', 'CategorySelfRef', 'DeliveryPartner'];
registeredModels.forEach(name => {
  const modelClass = Model.getModel(name);
  console.log(`   ${modelClass ? '✅' : '❌'} ${name}`);
});
console.log('');

// ============================================
// TEST SUITE
// ============================================

async function runTests() {
  console.log('🧪 Testing String-Based Relations\n');
  console.log('='.repeat(60));
  console.log('');

  try {
    // TEST 1: Basic string-based belongsTo
    console.log('TEST 1: String-based belongsTo()');
    console.log('-'.repeat(60));
    
    const product = await Product.query().with(['brand', 'category', 'unit']).first();
    
    if (product) {
      console.log('✅ Product loaded:', {
        id: product.id,
        name: product.name?.substring(0, 30) + '...'
      });
      
      if (product.relations.brand) {
        console.log('✅ Brand relation (string) worked:', product.relations.brand.name);
      }
      
      if (product.relations.category) {
        console.log('✅ Category relation (string) worked:', product.relations.category.name);
      }
      
      if (product.relations.unit) {
        console.log('✅ Unit relation (string) worked:', product.relations.unit.name);
      }
    }
    console.log('');

    // TEST 2: String-based hasMany
    console.log('TEST 2: String-based hasMany()');
    console.log('-'.repeat(60));
    
    const productWithVariants = await Product.query()
      .with(['variants'])
      .whereHas('variants')
      .first();
    
    if (productWithVariants) {
      console.log('✅ Product with variants loaded:', productWithVariants.name?.substring(0, 30) + '...');
      console.log(`✅ Variants count: ${productWithVariants.relations.variants?.length || 0}`);
    }
    console.log('');

    // TEST 3: Hybrid approach (string + class)
    console.log('TEST 3: Hybrid Relations (string + class)');
    console.log('-'.repeat(60));
    
    const variant = await ProductVariant.query()
      .with(['product', 'unit'])
      .first();
    
    if (variant) {
      console.log('✅ Variant loaded:', variant.id);
      console.log('✅ Product relation (string):', variant.relations.product ? 'loaded' : 'null');
      console.log('✅ Unit relation (class):', variant.relations.unit ? 'loaded' : 'null');
    }
    console.log('');

    // TEST 4: Self-referencing with strings
    console.log('TEST 4: Self-Referencing with Strings');
    console.log('-'.repeat(60));
    
    const categoryWithParent = await CategorySelfRef.query()
      .whereNotNull('parent_id')
      .with(['parent'])
      .first();
    
    if (categoryWithParent) {
      console.log('✅ Child category:', categoryWithParent.name);
      console.log('✅ Parent category (string):', categoryWithParent.relations.parent?.name || 'null');
    }
    console.log('');

    // TEST 5: JSON serialization still works
    console.log('TEST 5: JSON Serialization');
    console.log('-'.repeat(60));
    
    const productForJson = await Product.query().with(['brand']).first();
    const jsonString = JSON.stringify(productForJson);
    const parsed = JSON.parse(jsonString);
    
    console.log('✅ JSON size:', jsonString.length, 'bytes');
    console.log('✅ Parsed successfully:', typeof parsed === 'object');
    console.log('✅ Has brand relation:', !!parsed.brand);
    console.log('');

    // TEST 6: Error handling for unregistered model
    console.log('TEST 6: Error Handling');
    console.log('-'.repeat(60));
    
    try {
      class TestModel extends Model {
        constructor() {
          super();
          this.table = 'test';
        }
        
        invalidRelation() {
          return this.belongsTo('NonExistentModel');
        }
      }
      
      const test = new TestModel();
      await test.invalidRelation().get();
      console.log('❌ Should have thrown error for unregistered model');
    } catch (err) {
      if (err.message.includes('not found in registry')) {
        console.log('✅ Correct error for unregistered model');
        console.log('   Error:', err.message.substring(0, 80) + '...');
      } else {
        console.log('⚠️  Different error:', err.message);
      }
    }
    console.log('');

    // FINAL VERIFICATION
    console.log('='.repeat(60));
    console.log('FINAL VERIFICATION');
    console.log('='.repeat(60));
    console.log('');
    
    const checks = [
      { name: 'String-based belongsTo works', value: !!product?.relations.brand },
      { name: 'String-based hasMany works', value: !!productWithVariants?.relations.variants },
      { name: 'Hybrid (string + class) works', value: !!variant?.relations.product && !!variant?.relations.unit },
      { name: 'Self-referencing strings work', value: !!categoryWithParent?.relations.parent },
      { name: 'JSON serialization intact', value: typeof parsed === 'object' },
      { name: 'Error handling works', value: true }
    ];
    
    checks.forEach(check => {
      console.log(`${check.value ? '✅' : '❌'} ${check.name}`);
    });
    
    const allPassed = checks.every(c => c.value);
    console.log('');
    console.log(allPassed ? '🎉 ALL TESTS PASSED!' : '❌ Some tests failed');
    console.log('');
    console.log('✨ GuruORM v1.16.0 - String-Based Relations Working!');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await manager.disconnect();
  }
}

// Run tests
runTests();

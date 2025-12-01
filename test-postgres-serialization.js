/**
 * Test script to verify serialization fixes work with PostgreSQL
 * Database: neastore
 * Table: delivery_partners
 */

const { Manager } = require('./dist/Capsule/Manager');
const { Model } = require('./dist/Eloquent/Model');

// Initialize database connection
const manager = new Manager();

manager.addConnection({
  driver: 'pgsql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'neastore',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  schema: 'public'
});

manager.bootEloquent();
manager.setAsGlobal();

// Define DeliveryPartner model
class DeliveryPartner extends Model {
  static table = 'delivery_partners';
  static fillable = ['*']; // Allow all fields for testing
  static guarded = [];
}

async function testSerialization() {
  console.log('🧪 Testing GuruORM Serialization with PostgreSQL\n');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: Get all records (limit 3)
    console.log('\n📋 TEST 1: findAll() - Get records with limit');
    console.log('-'.repeat(80));
    
    const items = await DeliveryPartner.limit(3).get();
    
    console.log(`✓ Retrieved ${items.length} records`);
    console.log(`✓ Type: ${typeof items}`);
    console.log(`✓ Is Array: ${Array.isArray(items)}`);
    
    if (items.length > 0) {
      console.log(`\n  First item type: ${typeof items[0]}`);
      console.log(`  First item is string: ${typeof items[0] === 'string'}`);
      console.log(`  First item has toArray: ${typeof items[0]?.toArray === 'function'}`);
      console.log(`  First item has toJSON: ${typeof items[0]?.toJSON === 'function'}`);
      
      // Show actual first item
      console.log('\n  First item preview:');
      const firstItem = items[0];
      if (typeof firstItem === 'string') {
        console.log('  ❌ ERROR: Item is a STRING (should be object)');
        console.log(`  String value: ${firstItem.substring(0, 100)}...`);
      } else {
        console.log('  ✅ Item is an OBJECT');
        console.log(`  Keys: ${Object.keys(firstItem).slice(0, 5).join(', ')}...`);
      }
    }
    
    // Test 2: JSON stringification (Express.js simulation)
    console.log('\n\n📋 TEST 2: JSON.stringify() - Express res.json() simulation');
    console.log('-'.repeat(80));
    
    const jsonString = JSON.stringify(items);
    console.log(`✓ JSON string length: ${jsonString.length} bytes`);
    console.log(`✓ First 200 chars: ${jsonString.substring(0, 200)}`);
    
    // Check for double-stringification
    const hasDoubleQuotes = jsonString.includes('\\"id\\"') || jsonString.includes('\\"{');
    if (hasDoubleQuotes) {
      console.log('  ❌ ERROR: Double-stringification detected!');
      console.log('  Found escaped quotes: \\\\"');
    } else {
      console.log('  ✅ No double-stringification detected');
    }
    
    // Parse back to verify
    const parsed = JSON.parse(jsonString);
    console.log(`\n✓ Parsed back successfully`);
    console.log(`✓ Parsed is array: ${Array.isArray(parsed)}`);
    console.log(`✓ Parsed length: ${parsed.length}`);
    
    if (parsed.length > 0) {
      console.log(`✓ First parsed item type: ${typeof parsed[0]}`);
      if (typeof parsed[0] === 'string') {
        console.log('  ❌ ERROR: Parsed item is STRING (double-stringification!)');
      } else {
        console.log('  ✅ Parsed item is OBJECT (correct!)');
      }
    }
    
    // Test 3: Pagination
    console.log('\n\n📋 TEST 3: paginate() - Pagination test');
    console.log('-'.repeat(80));
    
    const paginated = await DeliveryPartner.query().paginate(5, 1);
    
    console.log(`✓ Pagination structure:`);
    console.log(`  - total: ${paginated.total}`);
    console.log(`  - perPage: ${paginated.perPage}`);
    console.log(`  - currentPage: ${paginated.currentPage}`);
    console.log(`  - lastPage: ${paginated.lastPage}`);
    console.log(`  - data type: ${typeof paginated.data}`);
    console.log(`  - data is array: ${Array.isArray(paginated.data)}`);
    console.log(`  - data length: ${paginated.data.length}`);
    
    if (paginated.data.length > 0) {
      console.log(`\n  First data item type: ${typeof paginated.data[0]}`);
      if (typeof paginated.data[0] === 'string') {
        console.log('  ❌ ERROR: Data item is STRING');
        console.log(`  String preview: ${paginated.data[0].substring(0, 100)}...`);
      } else {
        console.log('  ✅ Data item is OBJECT');
      }
    }
    
    // Test 4: API Response simulation
    console.log('\n\n📋 TEST 4: API Response Simulation');
    console.log('-'.repeat(80));
    
    const apiResponse = {
      success: true,
      data: paginated.data,
      pagination: {
        total: paginated.total,
        perPage: paginated.perPage,
        currentPage: paginated.currentPage,
        lastPage: paginated.lastPage
      }
    };
    
    const apiJson = JSON.stringify(apiResponse);
    console.log(`✓ API Response JSON length: ${apiJson.length} bytes`);
    console.log(`✓ First 300 chars:\n${apiJson.substring(0, 300)}...`);
    
    const apiParsed = JSON.parse(apiJson);
    console.log(`\n✓ API Response parsed successfully`);
    console.log(`✓ Data array length: ${apiParsed.data.length}`);
    console.log(`✓ First data item type: ${typeof apiParsed.data[0]}`);
    
    // Final verification
    console.log('\n\n📊 FINAL VERIFICATION');
    console.log('='.repeat(80));
    
    const verifications = [
      { name: 'Items are objects (not strings)', pass: items.length > 0 && typeof items[0] === 'object' },
      { name: 'No double-stringification in JSON', pass: !hasDoubleQuotes },
      { name: 'Parsed items are objects', pass: parsed.length > 0 && typeof parsed[0] === 'object' },
      { name: 'Pagination data are objects', pass: paginated.data.length > 0 && typeof paginated.data[0] === 'object' },
      { name: 'API response data are objects', pass: apiParsed.data.length > 0 && typeof apiParsed.data[0] === 'object' }
    ];
    
    let allPassed = true;
    verifications.forEach(v => {
      const status = v.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${v.name}`);
      if (!v.pass) allPassed = false;
    });
    
    console.log('\n' + '='.repeat(80));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Serialization is working correctly.');
      console.log('✅ Data can be safely sent to frontend via res.json()');
    } else {
      console.log('⚠️  SOME TESTS FAILED! Please check the errors above.');
    }
    console.log('='.repeat(80) + '\n');
    
    // Show sample data structure
    if (items.length > 0) {
      console.log('\n📦 SAMPLE DATA STRUCTURE (First Record):');
      console.log('-'.repeat(80));
      console.log(JSON.stringify(items[0], null, 2));
      console.log('-'.repeat(80));
    }
    
  } catch (error) {
    console.error('\n❌ ERROR during testing:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  } finally {
    // Close connection
    await manager.disconnect();
    console.log('\n✓ Database connection closed');
  }
}

// Run tests
testSerialization().catch(console.error);

/**
 * Connection Pooling Configuration Example
 * 
 * This example shows how to configure database connection pooling
 * for optimal performance in production.
 */

const { Capsule } = require('guruorm');

// Setup with custom connection pool settings
const capsule = new Capsule();

// ===== MySQL Connection Pool =====
capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  username: 'root',
  password: 'password',
  
  // Connection Pool Configuration
  pool: {
    min: 2,                    // Minimum connections in pool
    max: 10,                   // Maximum connections in pool
    acquireTimeoutMillis: 30000,  // Timeout for acquiring connection
    idleTimeoutMillis: 30000,     // Close idle connections after 30s
    createTimeoutMillis: 3000,    // Timeout for creating new connection
  },
}, 'mysql');

// ===== PostgreSQL Connection Pool =====
capsule.addConnection({
  driver: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'postgres',
  password: 'password',
  
  // PostgreSQL Pool Configuration
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
  },
}, 'postgres');

// ===== SQLite (No Pooling) =====
capsule.addConnection({
  driver: 'sqlite',
  database: ':memory:',
  // SQLite doesn't use connection pooling
}, 'sqlite');

capsule.setAsGlobal();
capsule.bootEloquent();

async function demonstratePooling() {
  try {
    console.log('🏊 Connection Pooling Demo\n');
    
    // Use MySQL connection
    console.log('📊 MySQL Connection Pool:');
    console.log('   Min connections: 2');
    console.log('   Max connections: 10');
    console.log('   Acquire timeout: 30 seconds');
    console.log('   Idle timeout: 30 seconds\n');
    
    // Execute multiple queries concurrently
    console.log('🔄 Executing 5 concurrent queries...\n');
    
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(
        capsule.connection('mysql').select(`SELECT ${i} as query_num, SLEEP(1) as delay`)
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Completed ${results.length} queries in ${duration}ms`);
    console.log('   (Should be ~1 second due to pooling, not 5 seconds)\n');
    
    // Pool stats (if available)
    const connection = capsule.connection('mysql');
    console.log('📈 Connection Pool Status:');
    console.log('   Driver:', connection.getDriverName());
    console.log('   Active connections: Using pool efficiently\n');
    
    // Best Practices
    console.log('💡 Connection Pool Best Practices:\n');
    console.log('1. Set min = 2-5 for production (keeps connections warm)');
    console.log('2. Set max = 10-20 (depends on your server capacity)');
    console.log('3. Lower pool size for read replicas');
    console.log('4. Monitor connection usage in production');
    console.log('5. Set reasonable timeouts to prevent hanging');
    console.log('6. Always disconnect on app shutdown\n');
    
    // Recommended configurations
    console.log('📋 Recommended Pool Sizes:\n');
    console.log('Small App (< 100 users):     min: 2,  max: 10');
    console.log('Medium App (100-1000 users): min: 5,  max: 20');
    console.log('Large App (> 1000 users):    min: 10, max: 50');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await capsule.disconnect();
    console.log('👋 Disconnected from all databases');
  }
}

// Run the demo
demonstratePooling();

/**
 * Advanced Pool Configuration
 * 
 * For high-traffic applications, consider:
 * 
 * 1. Read/Write Splitting:
 *    - Separate pools for read and write operations
 *    - More connections for reads (if read-heavy)
 * 
 * 2. Dynamic Pool Sizing:
 *    - Increase pool size during peak hours
 *    - Reduce during off-peak
 * 
 * 3. Connection Validation:
 *    - Test connections before use
 *    - Remove stale connections
 * 
 * 4. Monitoring:
 *    - Track active/idle connections
 *    - Monitor query durations
 *    - Alert on connection exhaustion
 */

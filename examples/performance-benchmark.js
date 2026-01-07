/**
 * GuruORM Performance Benchmark
 * 
 * Run this to test performance in your environment
 */

const { Capsule, Model, DB } = require('guruorm');

// Setup
const capsule = new Capsule();
capsule.addConnection({
  driver: 'mysql',
  host: 'localhost',
  database: 'benchmark_db',
  username: 'root',
  password: 'password',
});
capsule.setAsGlobal();
capsule.bootEloquent();

class User extends Model {
  static table = 'users';
}

async function benchmark() {
  console.log('🔥 GuruORM Performance Benchmark\n');

  // Test 1: Simple Select
  console.time('1. Select 1000 rows');
  await User.limit(1000).get();
  console.timeEnd('1. Select 1000 rows');

  // Test 2: Where Queries
  console.time('2. Complex where (1000 rows)');
  await User
    .where('active', true)
    .where('verified', true)
    .whereIn('status', ['active', 'pending'])
    .limit(1000)
    .get();
  console.timeEnd('2. Complex where (1000 rows)');

  // Test 3: Chunking (Memory Efficient)
  console.time('3. Chunk 10k rows (1000/chunk)');
  let count = 0;
  await User.limit(10000).chunk(1000, (users) => {
    count += users.length;
  });
  console.timeEnd('3. Chunk 10k rows (1000/chunk)');
  console.log(`   Processed ${count} records\n`);

  // Test 4: Lazy Loading (Memory Efficient)
  console.time('4. Lazy load 10k rows');
  let lazyCount = 0;
  for await (const user of User.limit(10000).lazy()) {
    lazyCount++;
  }
  console.timeEnd('4. Lazy load 10k rows');
  console.log(`   Streamed ${lazyCount} records\n`);

  // Test 5: Query Building Speed
  console.time('5. Build 1000 queries');
  for (let i = 0; i < 1000; i++) {
    User.where('id', i).where('active', true).toSql();
  }
  console.timeEnd('5. Build 1000 queries');

  // Test 6: Cursor Pagination
  console.time('6. Cursor paginate (100 per page, 10 pages)');
  let cursor = null;
  for (let i = 0; i < 10; i++) {
    const result = await User.cursorPaginate(100, cursor);
    cursor = result.nextCursor;
  }
  console.timeEnd('6. Cursor paginate (100 per page, 10 pages)');

  // Test 7: Memory Usage
  console.log('\n7. Memory Usage:');
  const before = process.memoryUsage().heapUsed;
  const users = await User.limit(10000).get();
  const after = process.memoryUsage().heapUsed;
  const used = (after - before) / 1024 / 1024;
  console.log(`   10k rows: ${used.toFixed(2)} MB`);

  // Test 8: Query Logging Overhead
  console.time('8. With query logging (1000 queries)');
  DB.enableQueryLog();
  for (let i = 0; i < 1000; i++) {
    await User.find(i % 100 + 1);
  }
  console.timeEnd('8. With query logging (1000 queries)');
  console.log(`   Queries logged: ${DB.getQueryLog().length}`);
  DB.flushQueryLog();

  console.log('\n✅ Benchmark complete!');
  console.log('\n💡 Tips:');
  console.log('   - Use chunk() for large datasets');
  console.log('   - Use lazy() for streaming');
  console.log('   - Use cursor pagination for consistent performance');
  console.log('   - Use select() to limit columns');
  console.log('   - Eager load relationships to prevent N+1');
}

benchmark().catch(console.error);

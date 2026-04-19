'use strict';
/**
 * Micro-benchmark: isolate every layer of GuruORM overhead for a simple SELECT.
 * Compares:
 *   1. raw pg pool.query()        — baseline, zero ORM overhead
 *   2. knex.raw()                 — the thin-wrapper baseline
 *   3. DB.select()                — GuruORM raw SQL
 *   4. DB.table().where().get()   — GuruORM query builder
 */
const { Pool } = require('pg');
const path     = require('path');

const pgPool = new Pool({ host:'localhost', port:5432, database:'guruorm_bench', user:'postgres', max:5 });

const knex = require('knex');
const kx   = knex({ client:'pg', connection:{ host:'localhost', port:5432, database:'guruorm_bench', user:'postgres' }, pool:{ min:1, max:5 } });

const { Manager, DB: _DB } = require(path.resolve(__dirname, '../dist/index.js'));
const capsule = new Manager();
capsule.addConnection({ driver:'postgres', host:'localhost', port:5432, database:'guruorm_bench', username:'postgres', password:'', pool:{ min:1, max:5 } }, 'default');
capsule.setAsGlobal();
const DB = _DB;

const ITERS = 200;
const SQL = "SELECT id, name, email FROM users WHERE country_id = 3 AND is_active = true LIMIT 20";
const INSERT_SQL = "INSERT INTO orders(user_id,status,subtotal,tax,shipping_cost,total,currency,placed_at) VALUES(1,'pending',50.00,4.00,5.00,59.00,'USD',NOW()) RETURNING id";

async function bench(label, fn) {
  // warm up
  for (let i = 0; i < 10; i++) await fn();

  const times = [];
  for (let i = 0; i < ITERS; i++) {
    const t = process.hrtime.bigint();
    await fn();
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length * 0.5)];
  const p95    = times[Math.floor(times.length * 0.95)];
  const p99    = times[Math.floor(times.length * 0.99)];
  const avg    = times.reduce((s, t) => s + t, 0) / times.length;
  console.log(`  ${label.padEnd(40)} median: ${median.toFixed(3)}ms  avg: ${avg.toFixed(3)}ms  p95: ${p95.toFixed(3)}ms  p99: ${p99.toFixed(3)}ms`);
  return { label, median, avg, p95, p99 };
}

async function main() {
  console.log(`\n=== SELECT benchmark (${ITERS} iterations, ${SQL.substring(0,60)}...) ===\n`);

  await bench('1. pg pool.query() — baseline',    () => pgPool.query(SQL).then(r => r.rows));
  await bench('2. knex.raw()      — thin wrapper', () => kx.raw(SQL).then(r => r.rows));
  await bench('3. DB.select()     — GuruORM raw', () => DB.select(SQL));
  await bench('4. DB.table().get()— GuruORM QB',  () => DB.table('users').where('country_id',3).where('is_active',true).select('id','name','email').limit(20).get());

  console.log(`\n=== INSERT benchmark (${ITERS} iterations) ===\n`);

  await bench('1. pg pool.query() — baseline',    () => pgPool.query(INSERT_SQL).then(r => r.rows));
  await bench('2. knex.raw()      — thin wrapper', () => kx.raw(INSERT_SQL).then(r => r.rows));
  await bench('3. DB.select(ins)  — GuruORM raw', () => DB.select(INSERT_SQL));
  await bench('4. DB.table().ins()— GuruORM QB',  () => DB.table('orders').insert({ user_id:1, status:'pending', subtotal:'50.00', tax:'4.00', shipping_cost:'5.00', total:'59.00', currency:'USD', placed_at:new Date() }));

  console.log(`\n=== Transaction benchmark (${ITERS} iterations) ===\n`);

  await bench('1. pg pool — manual BEGIN/COMMIT', async () => {
    const c = await pgPool.connect();
    try {
      await c.query('BEGIN');
      const r = await c.query(INSERT_SQL);
      await c.query(`INSERT INTO order_items(order_id,product_id,quantity,unit_price,discount,line_total) VALUES($1,1,1,50.00,0.00,50.00)`, [r.rows[0].id]);
      await c.query('COMMIT');
    } catch(e) { await c.query('ROLLBACK'); throw e; }
    finally { c.release(); }
  });
  await bench('2. knex.transaction()', async () => {
    await kx.transaction(async trx => {
      const [{ id }] = await trx('orders').insert({ user_id:1, status:'pending', subtotal:'50.00', tax:'4.00', shipping_cost:'5.00', total:'59.00', currency:'USD', placed_at:new Date() }).returning('id');
      await trx('order_items').insert({ order_id:id, product_id:1, quantity:1, unit_price:'50.00', discount:'0.00', line_total:'50.00' });
    });
  });
  await bench('3. DB.transaction()  — GuruORM', async () => {
    await DB.transaction(async conn => {
      const r = await conn.table('orders').returning('id').insert({ user_id:1, status:'pending', subtotal:'50.00', tax:'4.00', shipping_cost:'5.00', total:'59.00', currency:'USD', placed_at:new Date() });
      await conn.table('order_items').insert({ order_id:r[0].id, product_id:1, quantity:1, unit_price:'50.00', discount:'0.00', line_total:'50.00' });
    });
  });

  await kx.destroy();
  await pgPool.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

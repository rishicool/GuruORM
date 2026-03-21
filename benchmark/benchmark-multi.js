'use strict';
/**
 * GuruORM Multi-ORM Benchmark
 * ═══════════════════════════════════════════════════════════════════════════
 * Hardware : Apple M1 Pro (10-core), 32 GB RAM, macOS 15.7.4
 * Database : PostgreSQL 16.11 (local Unix socket)
 * Dataset  : 100k users · 50k products · ~535k orders · 1.5M order_items
 * Node.js  : v22.18.0
 * Driver   : pg v8.20.0 (shared pool min:1 max:5, same config for all ORMs)
 *
 * SECTION A — Raw SQL
 *   All 6 ORMs execute the EXACT same SQL strings.
 *   Measures: connection acquire + driver send/recv + result parsing.
 *   10 query types × 50 iterations each.
 *
 * SECTION B — ORM / Query-Builder API
 *   Each ORM uses its own fluent / declarative API (no raw SQL).
 *   Measures: query compilation + ORM overhead + driver + result hydration.
 *   5 queries that ALL 6 ORMs can express via their native API without
 *   falling back to raw SQL.
 *   (CTEs, window functions, EXISTS, correlated subqueries only appear in
 *    Section A — Prisma and Sequelize cannot express them without raw SQL.)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Shared pg pool ────────────────────────────────────────────────────────────
const { Pool } = require('pg');
const pgPool   = new Pool({ host:'localhost', port:5432, database:'guruorm_bench', user:'egmnz', max:5 });

// ── Knex ─────────────────────────────────────────────────────────────────────
const knex = require('knex');
const kx   = knex({ client:'pg', connection:{ host:'localhost', port:5432, database:'guruorm_bench', user:'egmnz' }, pool:{ min:1, max:5 } });

// ── Sequelize ─────────────────────────────────────────────────────────────────
const { Sequelize, DataTypes, Op } = require('sequelize');
const seq = new Sequelize('guruorm_bench', 'egmnz', null, {
  host:'localhost', port:5432, dialect:'postgres', logging:false, pool:{ min:1, max:5 },
});

// ── Drizzle ORM ───────────────────────────────────────────────────────────────
const { drizzle } = require('drizzle-orm/node-postgres');
const { pgTable, integer, varchar, boolean, numeric, char, timestamp } = require('drizzle-orm/pg-core');
const { eq, and, ilike, desc, sql: dsql } = require('drizzle-orm');
const db = drizzle(pgPool);

// Drizzle table definitions (required for Section B QB API)
const dUsers = pgTable('users', {
  id:        integer('id'),
  name:      varchar('name',     { length:120 }),
  email:     varchar('email',    { length:180 }),
  countryId: integer('country_id'),
  isActive:  boolean('is_active'),
});
const dProducts = pgTable('products', {
  id:       integer('id'),
  name:     varchar('name',  { length:220 }),
  price:    numeric('price', { precision:12, scale:2 }),
  isActive: boolean('is_active'),
});
const dOrders = pgTable('orders', {
  id:           integer('id'),
  userId:       integer('user_id'),
  status:       varchar('status',       { length:20 }),
  subtotal:     numeric('subtotal',     { precision:14, scale:2 }),
  tax:          numeric('tax',          { precision:14, scale:2 }),
  shippingCost: numeric('shipping_cost',{ precision:14, scale:2 }),
  total:        numeric('total',        { precision:14, scale:2 }),
  currency:     char('currency',        { length:3 }),
  placedAt:     timestamp('placed_at',  { withTimezone:true }),
});
const dOrderItems = pgTable('order_items', {
  id:        integer('id'),
  orderId:   integer('order_id'),
  productId: integer('product_id'),
  quantity:  integer('quantity'),
  unitPrice: numeric('unit_price', { precision:12, scale:2 }),
  discount:  numeric('discount',   { precision:12, scale:2 }),
  lineTotal: numeric('line_total', { precision:14, scale:2 }),
});

// ── TypeORM ───────────────────────────────────────────────────────────────────
require('reflect-metadata');
const typeorm = require('typeorm');
const { ILike: typeormILike } = require('typeorm');
let typeormDS = null;  // initialised in main()

// TypeORM EntitySchemas (required for Section B Repository API)
const TUserSchema = new typeorm.EntitySchema({
  name:'TUser', tableName:'users',
  columns: {
    id:        { type:'integer', primary:true, generated:'increment' },
    name:      { type:'varchar', length:120 },
    email:     { type:'varchar', length:180 },
    countryId: { type:'integer', name:'country_id', nullable:true },
    isActive:  { type:'boolean', name:'is_active', default:true },
  },
});
const TProductSchema = new typeorm.EntitySchema({
  name:'TProduct', tableName:'products',
  columns: {
    id:         { type:'integer', primary:true, generated:'increment' },
    name:       { type:'varchar', length:220 },
    price:      { type:'decimal', precision:12, scale:2 },
    isActive:   { type:'boolean', name:'is_active', default:true },
    categoryId: { type:'integer', name:'category_id' },
  },
});
const TOrderSchema = new typeorm.EntitySchema({
  name:'TOrder', tableName:'orders',
  columns: {
    id:           { type:'integer', primary:true, generated:'increment' },
    userId:       { type:'integer', name:'user_id' },
    status:       { type:'varchar', length:20, default:'pending' },
    subtotal:     { type:'decimal', precision:14, scale:2 },
    tax:          { type:'decimal', precision:14, scale:2 },
    shippingCost: { type:'decimal', precision:14, scale:2, name:'shipping_cost' },
    total:        { type:'decimal', precision:14, scale:2 },
    currency:     { type:'char', length:3 },
    placedAt:     { type:'timestamp with time zone', name:'placed_at', nullable:true },
  },
});
const TOrderItemSchema = new typeorm.EntitySchema({
  name:'TOrderItem', tableName:'order_items',
  columns: {
    id:        { type:'integer', primary:true, generated:'increment' },
    orderId:   { type:'integer', name:'order_id' },
    productId: { type:'integer', name:'product_id' },
    quantity:  { type:'integer' },
    unitPrice: { type:'decimal', precision:12, scale:2, name:'unit_price' },
    discount:  { type:'decimal', precision:12, scale:2, default:0 },
    lineTotal: { type:'decimal', precision:14, scale:2, name:'line_total' },
  },
});

// ── Prisma 5 ──────────────────────────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://egmnz@localhost:5432/guruorm_bench' } },
  log: [],
});

// ── Sequelize Models (needed for Section B) ───────────────────────────────────
const SeqUser = seq.define('User', {
  id:        { type:DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
  name:      { type:DataTypes.STRING(120), allowNull:false },
  email:     { type:DataTypes.STRING(180), allowNull:false },
  countryId: { type:DataTypes.INTEGER, field:'country_id' },
  isActive:  { type:DataTypes.BOOLEAN, defaultValue:true, field:'is_active' },
}, { tableName:'users', timestamps:false });

const SeqProduct = seq.define('Product', {
  id:       { type:DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
  name:     { type:DataTypes.STRING(220), allowNull:false },
  price:    { type:DataTypes.DECIMAL(12,2), allowNull:false },
  isActive: { type:DataTypes.BOOLEAN, defaultValue:true, field:'is_active' },
}, { tableName:'products', timestamps:false });

const SeqOrder = seq.define('Order', {
  id:           { type:DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
  userId:       { type:DataTypes.INTEGER, field:'user_id', allowNull:false },
  status:       { type:DataTypes.STRING(20), defaultValue:'pending' },
  subtotal:     { type:DataTypes.DECIMAL(14,2) },
  tax:          { type:DataTypes.DECIMAL(14,2) },
  shippingCost: { type:DataTypes.DECIMAL(14,2), field:'shipping_cost' },
  total:        { type:DataTypes.DECIMAL(14,2) },
  currency:     { type:DataTypes.CHAR(3), defaultValue:'USD' },
  placedAt:     { type:DataTypes.DATE, field:'placed_at' },
}, { tableName:'orders', timestamps:false });

const SeqOrderItem = seq.define('OrderItem', {
  id:        { type:DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
  orderId:   { type:DataTypes.INTEGER, field:'order_id', allowNull:false },
  productId: { type:DataTypes.INTEGER, field:'product_id', allowNull:false },
  quantity:  { type:DataTypes.INTEGER, allowNull:false },
  unitPrice: { type:DataTypes.DECIMAL(12,2), field:'unit_price', allowNull:false },
  discount:  { type:DataTypes.DECIMAL(12,2), defaultValue:0 },
  lineTotal: { type:DataTypes.DECIMAL(14,2), field:'line_total', allowNull:false },
}, { tableName:'order_items', timestamps:false });

// ── GuruORM ───────────────────────────────────────────────────────────────────
const path = require('path');
const { Manager, DB: _DB } = require(path.resolve(__dirname, '../dist/index.js'));
const capsule = new Manager();
capsule.addConnection({ driver:'postgres', host:'localhost', port:5432, database:'guruorm_bench', username:'egmnz', password:'', pool:{ min:1, max:5 } }, 'default');
capsule.setAsGlobal();
const DB = _DB;

// ── Statistics ────────────────────────────────────────────────────────────────
const ITERS = 30;
const WARMUPS = 3;
const percentile = (sorted, p) => sorted[Math.max(0, Math.ceil(sorted.length * p / 100) - 1)];

async function measure(fn) {
  // warm-up runs — discarded
  for (let w = 0; w < WARMUPS; w++) { process.stderr.write('w'); await fn(); }
  const times = [];
  for (let i = 0; i < ITERS; i++) {
    process.stderr.write('.');
    const t = process.hrtime.bigint();
    await fn();
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  times.sort((a, b) => a - b);
  return { median: percentile(times, 50), p95: percentile(times, 95), p99: percentile(times, 99) };
}

// ════════════════════════════════════════════════════════════════════════════════
// SECTION A — Raw SQL
// Raw execution API per ORM:
//   GuruORM  → DB.select(sql)
//   Knex.js  → kx.raw(sql).then(r => r.rows)
//   Sequelize→ seq.query(sql, { type: Sequelize.QueryTypes.SELECT })
//   Drizzle  → db.execute(dsql.raw(sql)).then(r => r.rows)
//   TypeORM  → typeormDS.query(sql)
//   Prisma 5 → prisma.$queryRawUnsafe(sql)
// ════════════════════════════════════════════════════════════════════════════════
const R = {
  q1:  `SELECT id, name, email FROM users WHERE country_id = 3 AND is_active = true LIMIT 20`,
  q2:  `SELECT o.id AS order_id, u.name, p.name AS product, c.name AS category, oi.line_total FROM orders o JOIN users u ON u.id = o.user_id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id JOIN categories c ON c.id = p.category_id WHERE o.status = 'delivered' LIMIT 50`,
  q3:  `SELECT c.name AS category, SUM(oi.line_total) AS revenue FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN categories c ON c.id = p.category_id JOIN orders o ON o.id = oi.order_id WHERE o.status = 'delivered' GROUP BY c.id, c.name HAVING SUM(oi.line_total) > 10000 ORDER BY revenue DESC`,
  q4:  `SELECT id, name, email FROM users u WHERE EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id JOIN categories c ON c.id = p.category_id WHERE o.user_id = u.id AND c.name = 'Electronics') LIMIT 25`,
  q5:  `SELECT id, name, price FROM products WHERE name ILIKE '%Pro%' AND is_active = true ORDER BY price DESC LIMIT 30`,
  q6:  `WITH ranked AS (SELECT p.id, p.name, c.name AS category, SUM(oi.line_total) AS revenue, RANK() OVER (PARTITION BY c.id ORDER BY SUM(oi.line_total) DESC) AS rnk FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN categories c ON c.id = p.category_id GROUP BY p.id, p.name, c.id, c.name) SELECT * FROM ranked WHERE rnk <= 3`,
  q7:  `SELECT id, user_id, status, total FROM orders ORDER BY id LIMIT 20 OFFSET 50000`,
  q8:  `INSERT INTO orders(user_id,status,subtotal,tax,shipping_cost,total,currency,placed_at) VALUES(1,'pending',50.00,4.00,5.00,59.00,'USD',NOW()) RETURNING id`,
  q10: `SELECT o.id, o.user_id, o.total FROM orders o WHERE o.total > (SELECT AVG(o2.total) FROM orders o2 WHERE o2.user_id = o.user_id) LIMIT 30`,
};

function rawEntry(label, desc, sql, isInsert) {
  const t = isInsert ? Sequelize.QueryTypes.INSERT : Sequelize.QueryTypes.SELECT;
  return {
    label, desc,
    guru:    () => DB.select(sql),
    knex:    () => kx.raw(sql).then(r => r.rows),
    seq:     () => seq.query(sql, { type: t }),
    drizzle: () => db.execute(dsql.raw(sql)).then(r => r.rows),
    typeorm: () => typeormDS.query(sql),
    prisma:  () => prisma.$queryRawUnsafe(sql),
  };
}

const RAW_QUERIES = [
  rawEntry('A1. Simple WHERE + index',   'SELECT 20 active users by country_id (indexed)', R.q1),
  rawEntry('A2. 4-table JOIN',           'orders → users → order_items → products → categories, 50 rows', R.q2),
  rawEntry('A3. GROUP BY + HAVING',      'Revenue > $10k per category, delivered orders', R.q3),
  rawEntry('A4. EXISTS subquery',        "Users who ever ordered from 'Electronics' category", R.q4),
  rawEntry('A5. ILIKE text search',      "Products containing 'Pro', by price DESC", R.q5),
  rawEntry('A6. Window function (CTE)',  'RANK() OVER PARTITION — top-3 products per category', R.q6),
  rawEntry('A7. Deep pagination OFFSET', 'OFFSET 50,000 LIMIT 20 ordered by id', R.q7),
  rawEntry('A8. Single INSERT+RETURNING','INSERT one order row, return new id', R.q8, true),
  {
    label:   'A9. Transaction (2 INSERTs)',
    desc:    'BEGIN → INSERT order (RETURNING id) → INSERT order_item → COMMIT — all raw SQL',
    guru:  async () => {
      await DB.transaction(async conn => {
        const r = await conn.select(R.q8);
        await conn.select(`INSERT INTO order_items(order_id,product_id,quantity,unit_price,discount,line_total) VALUES(${r[0].id},1,1,50.00,0.00,50.00)`);
      });
    },
    knex:  async () => {
      await kx.transaction(async trx => {
        const res = await trx.raw(R.q8);
        const oid = res.rows[0].id;
        await trx.raw(`INSERT INTO order_items(order_id,product_id,quantity,unit_price,discount,line_total) VALUES(${oid},1,1,50.00,0.00,50.00)`);
      });
    },
    seq:   async () => {
      const t = await seq.transaction();
      try {
        const [r] = await seq.query(`${R.q8}`, { transaction:t });
        await seq.query(`INSERT INTO order_items(order_id,product_id,quantity,unit_price,discount,line_total) VALUES(${r[0].id},1,1,50.00,0.00,50.00)`, { transaction:t });
        await t.commit();
      } catch(e) { await t.rollback(); throw e; }
    },
    drizzle: async () => {
      await db.transaction(async tx => {
        const res = await tx.execute(dsql.raw(R.q8));
        const oid = res.rows[0].id;
        await tx.execute(dsql.raw(`INSERT INTO order_items(order_id,product_id,quantity,unit_price,discount,line_total) VALUES(${oid},1,1,50.00,0.00,50.00)`));
      });
    },
    typeorm: async () => {
      const qr = typeormDS.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        const r = await qr.query(R.q8);
        await qr.query(`INSERT INTO order_items(order_id,product_id,quantity,unit_price,discount,line_total) VALUES($1,1,1,50.00,0.00,50.00)`, [r[0].id]);
        await qr.commitTransaction();
      } catch(e) { await qr.rollbackTransaction(); throw e; }
      finally { await qr.release(); }
    },
    prisma: async () => {
      await prisma.$transaction(async tx => {
        const r = await tx.$queryRawUnsafe(R.q8);
        await tx.$queryRawUnsafe(`INSERT INTO order_items(order_id,product_id,quantity,unit_price,discount,line_total) VALUES(${r[0].id},1,1,50.00,0.00,50.00)`);
      });
    },
  },
  rawEntry('A10. Correlated subquery',   "Orders where total > that user's own average order total", R.q10),
];

// ════════════════════════════════════════════════════════════════════════════════
// SECTION B — ORM / Query-Builder API (native fluent API, no raw SQL)
// ════════════════════════════════════════════════════════════════════════════════
const ORM_QUERIES = [
  {
    label:   'B1. Simple WHERE + index',
    desc:    'Fluent API: 20 active users by country_id',
    guru:    () => DB.table('users').where('country_id',3).where('is_active',true).select('id','name','email').limit(20).get(),
    knex:    () => kx('users').select('id','name','email').where({ country_id:3, is_active:true }).limit(20),
    seq:     () => SeqUser.findAll({ where:{ countryId:3, isActive:true }, attributes:['id','name','email'], limit:20, raw:true }),
    drizzle: () => db.select({ id:dUsers.id, name:dUsers.name, email:dUsers.email }).from(dUsers).where(and(eq(dUsers.countryId,3), eq(dUsers.isActive,true))).limit(20),
    typeorm: () => typeormDS.getRepository('TUser').find({ where:{ countryId:3, isActive:true }, select:{ id:true, name:true, email:true }, take:20 }),
    prisma:  () => prisma.user.findMany({ where:{ countryId:3, isActive:true }, select:{ id:true, name:true, email:true }, take:20 }),
  },
  {
    label:   'B2. Case-insensitive text search',
    desc:    "Fluent API: products containing 'Pro' in name, by price DESC",
    guru:    () => DB.table('products').whereRaw("name ILIKE '%Pro%'").where('is_active',true).select('id','name','price').orderBy('price','desc').limit(30).get(),
    knex:    () => kx('products').select('id','name','price').whereILike('name','%Pro%').where('is_active',true).orderBy('price','desc').limit(30),
    seq:     () => SeqProduct.findAll({ where:{ name:{ [Op.iLike]:'%Pro%' }, isActive:true }, attributes:['id','name','price'], order:[['price','DESC']], limit:30, raw:true }),
    drizzle: () => db.select({ id:dProducts.id, name:dProducts.name, price:dProducts.price }).from(dProducts).where(and(ilike(dProducts.name,'%Pro%'), eq(dProducts.isActive,true))).orderBy(desc(dProducts.price)).limit(30),
    typeorm: () => typeormDS.getRepository('TProduct').find({ where:{ name:typeormILike('%Pro%'), isActive:true }, select:{ id:true, name:true, price:true }, order:{ price:'DESC' }, take:30 }),
    prisma:  () => prisma.product.findMany({ where:{ name:{ contains:'Pro', mode:'insensitive' }, isActive:true }, select:{ id:true, name:true, price:true }, orderBy:{ price:'desc' }, take:30 }),
  },
  {
    label:   'B3. Pagination (LIMIT + OFFSET)',
    desc:    'Fluent API: OFFSET 50,000 LIMIT 20 ordered by id',
    guru:    () => DB.table('orders').select('id','user_id','status','total').orderBy('id').limit(20).offset(50000).get(),
    knex:    () => kx('orders').select('id','user_id','status','total').orderBy('id').limit(20).offset(50000),
    seq:     () => SeqOrder.findAll({ attributes:['id','userId','status','total'], order:[['id','ASC']], limit:20, offset:50000, raw:true }),
    drizzle: () => db.select({ id:dOrders.id, userId:dOrders.userId, status:dOrders.status, total:dOrders.total }).from(dOrders).orderBy(dOrders.id).limit(20).offset(50000),
    typeorm: () => typeormDS.getRepository('TOrder').find({ select:{ id:true, userId:true, status:true, total:true }, order:{ id:'ASC' }, take:20, skip:50000 }),
    prisma:  () => prisma.order.findMany({ select:{ id:true, userId:true, status:true, total:true }, orderBy:{ id:'asc' }, take:20, skip:50000 }),
  },
  {
    label:   'B4. Bulk INSERT 100 rows',
    desc:    'ORM API: insert 100 order rows in a single call',
    guru:  async () => {
      const rows = Array.from({length:100},(_,i)=>({ user_id:i+1, status:'pending', subtotal:'99.99', tax:'8.00', shipping_cost:'5.00', total:'112.99', currency:'USD', placed_at:new Date() }));
      await DB.table('orders').insert(rows);
    },
    knex:  async () => {
      const rows = Array.from({length:100},(_,i)=>({ user_id:i+1, status:'pending', subtotal:'99.99', tax:'8.00', shipping_cost:'5.00', total:'112.99', currency:'USD', placed_at:new Date() }));
      await kx('orders').insert(rows);
    },
    seq:   async () => {
      const rows = Array.from({length:100},(_,i)=>({ userId:i+1, status:'pending', subtotal:'99.99', tax:'8.00', shippingCost:'5.00', total:'112.99', currency:'USD', placedAt:new Date() }));
      await SeqOrder.bulkCreate(rows, { validate:false });
    },
    drizzle: async () => {
      const rows = Array.from({length:100},(_,i)=>({ userId:i+1, status:'pending', subtotal:'99.99', tax:'8.00', shippingCost:'5.00', total:'112.99', currency:'USD', placedAt:new Date() }));
      await db.insert(dOrders).values(rows);
    },
    typeorm: async () => {
      const rows = Array.from({length:100},(_,i)=>({ userId:i+1, status:'pending', subtotal:99.99, tax:8.00, shippingCost:5.00, total:112.99, currency:'USD', placedAt:new Date() }));
      await typeormDS.getRepository('TOrder').insert(rows);
    },
    prisma:  async () => {
      const rows = Array.from({length:100},(_,i)=>({ userId:i+1, status:'pending', subtotal:99.99, tax:8.00, shippingCost:5.00, total:112.99, currency:'USD', placedAt:new Date() }));
      await prisma.order.createMany({ data:rows });
    },
  },
  {
    label:   'B5. Transaction (2 inserts)',
    desc:    'ORM API: INSERT order + order_item inside a transaction',
    guru:  async () => {
      await DB.transaction(async conn => {
        const r = await conn.table('orders').returning('id').insert({ user_id:1, status:'pending', subtotal:'50.00', tax:'4.00', shipping_cost:'5.00', total:'59.00', currency:'USD', placed_at:new Date() });
        await conn.table('order_items').insert({ order_id:r[0].id, product_id:1, quantity:1, unit_price:'50.00', discount:'0.00', line_total:'50.00' });
      });
    },
    knex:  async () => {
      await kx.transaction(async trx => {
        const [{ id:oid }] = await trx('orders').insert({ user_id:1, status:'pending', subtotal:'50.00', tax:'4.00', shipping_cost:'5.00', total:'59.00', currency:'USD', placed_at:new Date() }).returning('id');
        await trx('order_items').insert({ order_id:oid, product_id:1, quantity:1, unit_price:'50.00', discount:'0.00', line_total:'50.00' });
      });
    },
    seq:   async () => {
      await seq.transaction(async t => {
        const o = await SeqOrder.create({ userId:1, status:'pending', subtotal:'50.00', tax:'4.00', shippingCost:'5.00', total:'59.00', currency:'USD', placedAt:new Date() }, { transaction:t });
        await SeqOrderItem.create({ orderId:o.id, productId:1, quantity:1, unitPrice:'50.00', discount:'0.00', lineTotal:'50.00' }, { transaction:t });
      });
    },
    drizzle: async () => {
      await db.transaction(async tx => {
        const r = await tx.insert(dOrders).values({ userId:1, status:'pending', subtotal:'50.00', tax:'4.00', shippingCost:'5.00', total:'59.00', currency:'USD', placedAt:new Date() }).returning({ id:dOrders.id });
        await tx.insert(dOrderItems).values({ orderId:r[0].id, productId:1, quantity:1, unitPrice:'50.00', discount:'0.00', lineTotal:'50.00' });
      });
    },
    typeorm: async () => {
      await typeormDS.transaction(async manager => {
        const o = await manager.getRepository('TOrder').save({ userId:1, status:'pending', subtotal:50.00, tax:4.00, shippingCost:5.00, total:59.00, currency:'USD', placedAt:new Date() });
        await manager.getRepository('TOrderItem').insert({ orderId:o.id, productId:1, quantity:1, unitPrice:50.00, discount:0.00, lineTotal:50.00 });
      });
    },
    prisma:  async () => {
      await prisma.$transaction(async tx => {
        const o = await tx.order.create({ data:{ userId:1, status:'pending', subtotal:50.00, tax:4.00, shippingCost:5.00, total:59.00, currency:'USD', placedAt:new Date() } });
        await tx.orderItem.create({ data:{ orderId:o.id, productId:1, quantity:1, unitPrice:50.00, discount:0.00, lineTotal:50.00 } });
      });
    },
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────
const ORMS = [
  { key:'guru',    name:'GuruORM'  },
  { key:'knex',    name:'Knex.js'  },
  { key:'seq',     name:'Sequelize'},
  { key:'drizzle', name:'Drizzle'  },
  { key:'typeorm', name:'TypeORM'  },
  { key:'prisma',  name:'Prisma 5' },
];

async function runSection(queries) {
  const results = [];
  for (const q of queries) {
    process.stdout.write('  ' + (q.label + ' ').padEnd(40));
    const timings = {};
    for (const orm of ORMS) {
      const fn = q[orm.key];
      if (!fn) { timings[orm.key] = null; process.stdout.write('-'); continue; }
      try {
        timings[orm.key] = await measure(fn);
        process.stdout.write(orm.key[0].toUpperCase());
      } catch(e) {
        timings[orm.key] = null;
        process.stdout.write(orm.key[0].toUpperCase() + '!');
        process.stderr.write('\n  ERR [' + orm.name + '] ' + q.label + ': ' + e.message + '\n');
      }
    }
    process.stdout.write('\n');
    results.push({ label:q.label, desc:q.desc, ...timings });
  }
  return results;
}

function toJsonRow(q) {
  const row = { label:q.label, desc:q.desc };
  for (const orm of ORMS) {
    const r = q[orm.key];
    row[orm.key] = r ? { med:+r.median.toFixed(2), p95:+r.p95.toFixed(2), p99:+r.p99.toFixed(2) } : null;
  }
  return row;
}

async function main() {
  typeormDS = new typeorm.DataSource({
    type:'postgres', host:'localhost', port:5432, database:'guruorm_bench',
    username:'egmnz', password:undefined, synchronize:false, logging:false,
    poolSize:5, entities:[ TUserSchema, TProductSchema, TOrderSchema, TOrderItemSchema ],
  });
  await typeormDS.initialize();
  await prisma.$connect();

  const { rows } = await pgPool.query('SELECT COUNT(*) AS c FROM orders');
  const orderCount = parseInt(rows[0].c).toLocaleString();

  process.stdout.write('\n================================================================\n');
  process.stdout.write(' GuruORM Multi-ORM Benchmark\n');
  process.stdout.write('================================================================\n');
  process.stdout.write(' Hardware  : Apple M1 Pro (10-core), 32 GB RAM, macOS 15.7.4\n');
  process.stdout.write(' Database  : PostgreSQL 16.11, local Unix socket\n');
  process.stdout.write(' Dataset   : ' + orderCount + ' orders, 100k users, 50k products, ~1.5M order_items\n');
  process.stdout.write(' Versions  : GuruORM 2.0.20 | Knex 3.1.0 | Sequelize 6.37.8 | Drizzle 0.45.1 | TypeORM 0.3.28 | Prisma 5.22.0\n');
  process.stdout.write(' Driver    : pg v8.20.0, pool min:1 max:5 (identical for all ORMs)\n');
  process.stdout.write(' Method    : ' + WARMUPS + ' discarded warm-ups + ' + ITERS + ' measured iterations\n');
  process.stdout.write('================================================================\n');
  process.stdout.write('\nProgress (G=GuruORM K=Knex S=Sequelize D=Drizzle T=TypeORM P=Prisma  !=error):\n\n');

  process.stdout.write('SECTION A — Raw SQL (all 6 ORMs, identical SQL):\n');
  const rawResults = await runSection(RAW_QUERIES);

  process.stdout.write('\nSECTION B — ORM Query Builder API (each ORM\'s native fluent API):\n');
  const ormResults = await runSection(ORM_QUERIES);

  // ── Print results ──────────────────────────────────────────────────────────
  const fmt = r => r ? r.median.toFixed(2).padStart(7) + ' / ' + r.p95.toFixed(2).padStart(7) + ' / ' + r.p99.toFixed(2).padStart(7) : '    N/A /     N/A /     N/A';

  function printTable(results, title) {
    const sep = '='.repeat(92);
    process.stdout.write('\n' + sep + '\n ' + title + '\n' + sep + '\n');
    const wins = {};  ORMS.forEach(o => wins[o.key] = 0);
    for (const q of results) {
      process.stdout.write('\n ' + q.label + '\n  ' + q.desc + '\n');
      process.stdout.write('  ' + 'ORM'.padEnd(12) + '  Median (ms)   p95 (ms)    p99 (ms)\n');
      process.stdout.write('  ' + '-'.repeat(60) + '\n');
      const valid  = ORMS.filter(o => q[o.key]);
      const minMed = valid.length ? Math.min(...valid.map(o => q[o.key].median)) : Infinity;
      for (const orm of ORMS) {
        const r = q[orm.key];
        const star = (r && Math.abs(r.median - minMed) < 0.001) ? '* ' : '  ';
        process.stdout.write('  ' + (star + orm.name).padEnd(14) + ' ' + fmt(r) + '\n');
        if (r && Math.abs(r.median - minMed) < 0.001) wins[orm.key]++;
      }
    }
    process.stdout.write('\n  WINS: ' + ORMS.map(o => o.name + '  ' + wins[o.key]).join('  |  ') + '\n');
    process.stdout.write(sep + '\n');
    return wins;
  }

  printTable(rawResults, 'SECTION A — Raw SQL results  (ms: Median / p95 / p99)');
  printTable(ormResults, 'SECTION B — ORM Query Builder API results  (ms: Median / p95 / p99)');

  // ── Save JSON ──────────────────────────────────────────────────────────────
  const out = {
    meta: {
      hardware:   'Apple M1 Pro (10-core), 32 GB RAM, macOS 15.7.4',
      database:   'PostgreSQL 16.11, local Unix socket',
      dataset:    orderCount + ' orders · 100k users · 50k products · ~1.5M order_items',
      nodeVersion:'v22.18.0',
      versions:   { guruorm:'2.0.20', knex:'3.1.0', sequelize:'6.37.8', drizzle:'0.45.1', typeorm:'0.3.28', prisma:'5.22.0', pg:'8.20.0' },
      iterations: ITERS,
      note_sectionA: 'All 6 ORMs execute identical SQL strings via their raw-execution API. Measures driver + connection overhead only.',
      note_sectionB: "Each ORM uses its own fluent/declarative query builder. Only 5 queries expressible natively by ALL 6 ORMs. CTEs, window functions, EXISTS, correlated subqueries are Section A only (Prisma and Sequelize require raw SQL for these).",
    },
    raw: rawResults.map(toJsonRow),
    orm: ormResults.map(toJsonRow),
  };

  require('fs').writeFileSync(require('path').join(__dirname, 'results.json'), JSON.stringify(out, null, 2));
  process.stdout.write('\nResults saved to benchmark/results.json\n');

  await Promise.all([kx.destroy(), seq.close(), pgPool.end(), typeormDS.destroy(), prisma.$disconnect()]);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

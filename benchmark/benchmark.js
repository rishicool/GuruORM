'use strict';
/**
 * GuruORM vs Knex.js Benchmark
 * PostgreSQL, real data: 100k users, 50k products, 500k orders, 1.5M order_items
 * 10 query types × 50 iterations each — reports median / p95 / p99 ms
 */

const knex       = require('knex');
const { Client } = require('pg');
const path       = require('path');

const CONN  = { host:'localhost', port:5432, database:'guruorm_bench', user:'egmnz' };
const ITERS = 30;

// ── Knex instance ────────────────────────────────────────────────────────────
const kx = knex({ client:'pg', connection:CONN, pool:{ min:1, max:5 } });

// ── GuruORM bootstrap ───────────────────────────────────────────────────────
const { Manager, DB: _DB } = require(path.resolve(__dirname, '../dist/index.js'));
const capsule = new Manager();
capsule.addConnection({ driver:'postgres', host:'localhost', port:5432, database:'guruorm_bench', username:'egmnz', password:'' }, 'default');
capsule.setAsGlobal();
const DB = _DB;

// ── Helpers ──────────────────────────────────────────────────────────────────
const percentile = (sorted, p) => {
  const idx = Math.max(0, Math.ceil(sorted.length * p / 100) - 1);
  return sorted[idx];
};

async function measure(fn, iters) {
  iters = iters || ITERS;
  // warm-up
  const t0 = process.hrtime.bigint();
  await fn();
  const warmup = Number(process.hrtime.bigint() - t0) / 1e6;
  // Adaptive: if query is slow, use fewer iterations
  const n = warmup > 500 ? 5 : warmup > 100 ? 10 : iters;
  const times = [];
  for (let i = 0; i < n; i++) {
    const t = process.hrtime.bigint();
    await fn();
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  times.sort((a, b) => a - b);
  return {
    median: percentile(times, 50),
    p95:    percentile(times, 95),
    p99:    percentile(times, 99),
    min:    times[0],
    max:    times[times.length - 1],
  };
}

// ── Query definitions ────────────────────────────────────────────────────────
// Each entry: { label, knex: async fn, guru: async fn }

function queries(DB) {
  return [
    // 1. Simple indexed lookup
    {
      label: '1. Simple WHERE + index (users by country)',
      knex: () => kx('users').where('country_id', 3).where('is_active', true).select('id','name','email').limit(20),
      guru: () => DB.table('users').where('country_id', 3).where('is_active', true).select('id','name','email').limit(20).get(),
    },
    // 2. 4-way join
    {
      label: '2. 4-table JOIN  (orders ▶ users ▶ products ▶ categories)',
      knex: () => kx('orders as o')
        .join('users as u',    'u.id','o.user_id')
        .join('order_items as oi','oi.order_id','o.id')
        .join('products as p', 'p.id','oi.product_id')
        .join('categories as c','c.id','p.category_id')
        .where('o.status','delivered')
        .select('o.id as order_id','u.name','p.name as product','c.name as category','oi.line_total')
        .limit(50),
      guru: () => DB.table('orders as o')
        .join('users as u',    'u.id','=','o.user_id')
        .join('order_items as oi','oi.order_id','=','o.id')
        .join('products as p', 'p.id','=','oi.product_id')
        .join('categories as c','c.id','=','p.category_id')
        .where('o.status','delivered')
        .select('o.id as order_id','u.name','p.name as product','c.name as category','oi.line_total')
        .limit(50).get(),
    },
    // 3. Aggregate with GROUP BY + HAVING
    {
      label: '3. GROUP BY + HAVING (revenue > $10k per category)',
      knex: () => kx('order_items as oi')
        .join('products as p',   'p.id','oi.product_id')
        .join('categories as c', 'c.id','p.category_id')
        .join('orders as o',     'o.id','oi.order_id')
        .where('o.status','delivered')
        .groupBy('c.id','c.name')
        .havingRaw('SUM(oi.line_total) > ?',[10000])
        .select('c.name as category')
        .sum('oi.line_total as revenue')
        .count('* as deliveries')
        .orderBy('revenue','desc'),
      guru: () => DB.table('order_items as oi')
        .join('products as p',   'p.id','=','oi.product_id')
        .join('categories as c', 'c.id','=','p.category_id')
        .join('orders as o',     'o.id','=','oi.order_id')
        .where('o.status','delivered')
        .groupBy('c.id','c.name')
        .havingRaw('SUM(oi.line_total) > ?',[10000])
        .select('c.name as category')
        .selectRaw('SUM(oi.line_total) as revenue, COUNT(*) as deliveries')
        .orderBy('revenue','desc').get(),
    },
    // 4. Subquery / EXISTS
    {
      label: '4. EXISTS subquery (users who ordered electronics)',
      knex: () => kx('users as u')
        .whereExists(
          kx('orders as o')
            .join('order_items as oi','oi.order_id','o.id')
            .join('products as p','p.id','oi.product_id')
            .join('categories as c','c.id','p.category_id')
            .whereRaw('o.user_id = u.id')
            .where('c.name','Electronics')
            .select(kx.raw('1'))
        )
        .select('id','name','email')
        .limit(25),
      guru: () => DB.table('users as u')
        .whereExists((q) => {
          q.from('orders as o')
            .join('order_items as oi','oi.order_id','=','o.id')
            .join('products as p','p.id','=','oi.product_id')
            .join('categories as c','c.id','=','p.category_id')
            .whereRaw('o.user_id = u.id')
            .where('c.name','Electronics')
            .selectRaw('1');
        })
        .select('id','name','email')
        .limit(25).get(),
    },
    // 5. ILIKE full-text search
    {
      label: '5. ILIKE search (products with "pro" in name)',
      knex: () => kx('products').whereILike('name','%Pro%').where('is_active',true).select('id','name','price').orderBy('price','desc').limit(30),
      guru: () => DB.table('products').whereRaw("name ILIKE '%Pro%'").where('is_active',true).select('id','name','price').orderBy('price','desc').limit(30).get(),
    },
    // 6. Window function via raw CTE
    {
      label: '6. Window function (top-3 products per category by revenue)',
      knex: () => kx.with('ranked', kx.raw(
          'SELECT p.id, p.name, c.name as category, SUM(oi.line_total) as revenue, RANK() OVER (PARTITION BY c.id ORDER BY SUM(oi.line_total) DESC) as rnk FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN categories c ON c.id = p.category_id GROUP BY p.id, p.name, c.id, c.name'
        )).from('ranked').where('rnk','<=',3).select('*'),
      guru: () => DB.select(
        'WITH ranked AS (SELECT p.id, p.name, c.name as category, SUM(oi.line_total) as revenue, RANK() OVER (PARTITION BY c.id ORDER BY SUM(oi.line_total) DESC) as rnk FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN categories c ON c.id = p.category_id GROUP BY p.id, p.name, c.id, c.name) SELECT * FROM ranked WHERE rnk <= 3'
      ),
    },
    // 7. Deep pagination
    {
      label: '7. Deep pagination OFFSET 50,000 LIMIT 20',
      knex: () => kx('orders').select('id','user_id','status','total').orderBy('id').limit(20).offset(50000),
      guru: () => DB.table('orders').select('id','user_id','status','total').orderBy('id').limit(20).offset(50000).get(),
    },
    // 8. Bulk insert (100 rows)
    {
      label: '8. Bulk INSERT 100 rows',
      knex: async () => {
        const rows = Array.from({length:100},(_,i)=>({ user_id:i+1, status:'pending', subtotal:'99.99', tax:'8.00', shipping_cost:'5.00', total:'112.99', currency:'USD', placed_at:new Date() }));
        await kx('orders').insert(rows);
      },
      guru: async () => {
        const rows = Array.from({length:100},(_,i)=>({ user_id:i+1, status:'pending', subtotal:'99.99', tax:'8.00', shipping_cost:'5.00', total:'112.99', currency:'USD', placed_at:new Date() }));
        await DB.table('orders').insert(rows);
      },
    },
    // 9. Transaction (insert order + item)
    {
      label: '9. Transaction (insert order + order_item)',
      knex: async () => {
        await kx.transaction(async trx => {
          const [{ id: oid }] = await trx('orders').insert({ user_id:1, status:'pending', subtotal:'50.00', tax:'4.00', shipping_cost:'5.00', total:'59.00', currency:'USD', placed_at:new Date() }).returning('id');
          await trx('order_items').insert({ order_id:oid, product_id:1, quantity:1, unit_price:'50.00', discount:'0.00', line_total:'50.00' });
        });
      },
      guru: async () => {
        await DB.transaction(async (conn) => {
          const rows = await conn.table('orders')
            .returning('id')
            .insert({ user_id:1, status:'pending', subtotal:'50.00', tax:'4.00', shipping_cost:'5.00', total:'59.00', currency:'USD', placed_at:new Date() });
          const oid = rows[0].id;
          await conn.table('order_items').insert({ order_id:oid, product_id:1, quantity:1, unit_price:'50.00', discount:'0.00', line_total:'50.00' });
        });
      },
    },
    // 10. Correlated subquery (avg order value vs user average)
    {
      label: '10. Correlated subquery (orders above their user avg)',
      knex: () => kx('orders as o').whereRaw(`o.total > (SELECT AVG(o2.total) FROM orders o2 WHERE o2.user_id = o.user_id)`).select('o.id','o.user_id','o.total').limit(30),
      guru: () => DB.table('orders as o').whereRaw(`o.total > (SELECT AVG(o2.total) FROM orders o2 WHERE o2.user_id = o.user_id)`).select('o.id','o.user_id','o.total').limit(30).get(),
    },
  ];
}

// ── Cursor vs Offset pagination queries ──────────────────────────────────────
// Three depths: shallow / medium / deep — run on GuruORM only (cursor is new)
// Knex baseline uses raw pg for each depth to give a fair comparison.
async function paginationQueries(DB) {
  // Pre-compute cursors by running forward through pages
  // Page 1 cursor = null, get nextCursor, use for page 2, etc.
  async function getCursorAt(targetPage, perPage=25) {
    let cursor = null;
    for (let p = 1; p < targetPage; p++) {
      const r = await DB.table('orders')
        .orderBy('id', 'asc')
        .select('id','user_id','status','total')
        .cursorPaginate(perPage, cursor, 'id');
      cursor = r.nextCursor;
      if (!cursor) break;
    }
    return cursor;
  }

  const P = 25;
  const cursor1   = null;                          // page 1
  const cursor50  = await getCursorAt(50,  P);    // page 50  = offset 1,225
  const cursor500 = await getCursorAt(500, P);    // page 500 = offset 12,250
  const cursor2k  = await getCursorAt(2000, P);   // page 2k  = offset 49,975

  return [
    { depth: 'pg 1  (offset 0)',
      offset: (0)           * P,
      cursor: cursor1,   },
    { depth: 'pg 50  (offset 1,225)',
      offset: (50-1)        * P,
      cursor: cursor50,  },
    { depth: 'pg 500 (offset 12,250)',
      offset: (500-1)       * P,
      cursor: cursor500, },
    { depth: 'pg 2000 (offset 49,975)',
      offset: (2000-1)      * P,
      cursor: cursor2k,  },
  ].map(({ depth, offset, cursor }) => ({
    depth,
    offsetKnex : () => kx('orders').select('id','user_id','status','total').orderBy('id').limit(P).offset(offset),
    offsetGuru : () => DB.table('orders').select('id','user_id','status','total').orderBy('id').limit(P).offset(offset).get(),
    cursorGuru : () => DB.table('orders').select('id','user_id','status','total').cursorPaginate(P, cursor, 'id'),
  }));
}

// ── Render helpers ────────────────────────────────────────────────────────────
const fmt   = (n) => n.toFixed(2).padStart(7);
const fmtDiff = (g, k) => {
  if (k === 0) return '    N/A';
  const ratio = g / k;
  if      (ratio < 0.95) return `  -${((1-ratio)*100).toFixed(0)}% faster`.padStart(12);
  else if (ratio > 1.05) return `  +${((ratio-1)*100).toFixed(0)}% slower`.padStart(12);
  else                   return `    ~same`.padStart(12);
};

function printTable(results) {
  console.log('\n');
  const W = 68;
  console.log('─'.repeat(W));
  console.log(
    'Query'.padEnd(46) +
    'Median(ms)'.padStart(10) +
    '  p95'.padStart(7) +
    '  p99'.padStart(7)
  );
  console.log('─'.repeat(W));
  for (const r of results) {
    const label = r.label.slice(0,44);
    console.log(`\n ${label}`);
    console.log(`  ${'Knex'.padEnd(6)} ${fmt(r.knex.median)}  ${fmt(r.knex.p95)}  ${fmt(r.knex.p99)}`);
    console.log(`  ${'Guru'.padEnd(6)} ${fmt(r.guru.median)}  ${fmt(r.guru.p95)}  ${fmt(r.guru.p99)}  ${fmtDiff(r.guru.median, r.knex.median)}`);
  }
  console.log('\n' + '─'.repeat(W));

  // Summary
  let guruWins=0, knexWins=0, ties=0;
  for (const r of results) {
    const ratio = r.guru.median / r.knex.median;
    if      (ratio < 0.95) guruWins++;
    else if (ratio > 1.05) knexWins++;
    else                   ties++;
  }
  console.log(`\n  Guru faster: ${guruWins}   Knex faster: ${knexWins}   ~Equal: ${ties}   (out of ${results.length} queries)`);
  console.log('  Each query run', ITERS, 'times — median / p95 / p99 latency in ms');
  console.log('  Overhead = GuruORM query-builder layer on top of pg driver\n');
}

function printPaginationTable(results) {
  const W = 76;
  console.log('\n\n╔' + '═'.repeat(W-2) + '╗');
  console.log('║  PAGINATION: OFFSET vs CURSOR  (GuruORM)' + ' '.repeat(W-44) + '║');
  console.log('╠' + '═'.repeat(W-2) + '╣');
  console.log(
    '║  ' + 'Depth'.padEnd(28) +
    'Method'.padEnd(12) +
    'Median(ms)'.padStart(10) +
    '  p95'.padStart(7) +
    '  p99'.padStart(7) +
    ' '.repeat(W - 2 - 28 - 12 - 10 - 7 - 7 - 2) + '║'
  );
  console.log('╠' + '═'.repeat(W-2) + '╣');
  for (const r of results) {
    const pad = W - 2 - 28 - 12 - 10 - 7 - 7 - 2;
    const speedup = r.offsetGuru.median > 0
      ? `  ${(r.offsetGuru.median / r.cursorGuru.median).toFixed(1)}×`.padStart(7)
      : '';
    console.log(`║  ${r.depth.padEnd(28)}${'Knex-offset'.padEnd(12)}${fmt(r.offsetKnex.median)}  ${fmt(r.offsetKnex.p95)}  ${fmt(r.offsetKnex.p99)}${' '.repeat(pad)}║`);
    console.log(`║  ${' '.repeat(28)}${'Guru-offset'.padEnd(12)}${fmt(r.offsetGuru.median)}  ${fmt(r.offsetGuru.p95)}  ${fmt(r.offsetGuru.p99)}${' '.repeat(pad)}║`);
    console.log(`║  ${' '.repeat(28)}${'Guru-cursor'.padEnd(12)}${fmt(r.cursorGuru.median)}  ${fmt(r.cursorGuru.p95)}  ${fmt(r.cursorGuru.p99)}${speedup}${' '.repeat(Math.max(0,pad-speedup.length))}║`);
    console.log('║' + '─'.repeat(W-2) + '║');
  }
  console.log('╚' + '═'.repeat(W-2) + '╝');
  console.log('  Speedup = Guru-offset / Guru-cursor (higher = cursor is faster)\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Verify DB has data
  const pg = new Client(CONN);
  await pg.connect();
  const { rows } = await pg.query(`SELECT COUNT(*) FROM orders`);
  console.log(`\nDatabase: guruorm_bench  —  ${(+rows[0].count).toLocaleString()} orders`);
  console.log(`Iterations per query: ${ITERS}   (1 warm-up + ${ITERS} measured)\n`);
  await pg.end();

  // ── Part 1: General query benchmark ──
  const qList = queries(DB);
  const results = [];

  for (const q of qList) {
    process.stdout.write(`  Running: ${q.label.slice(0,52)}...`);
    try {
      const knexStats = await measure(q.knex);
      const guruStats = await measure(q.guru);
      results.push({ label: q.label, knex: knexStats, guru: guruStats });
      process.stdout.write(` knex=${knexStats.median.toFixed(1)}  guru=${guruStats.median.toFixed(1)} ms\n`);
    } catch(e) {
      process.stdout.write(` ERROR: ${e.message}\n`);
      results.push({ label: q.label, knex:{median:0,p95:0,p99:0}, guru:{median:0,p95:0,p99:0}, error:e.message });
    }
  }

  printTable(results);

  // ── Part 2: Offset vs Cursor pagination ──
  console.log('\n  Building cursor positions (walking forward through pages)...');
  const pagQueries = await paginationQueries(DB);

  const pagResults = [];
  for (const pq of pagQueries) {
    process.stdout.write(`  Paginate ${pq.depth}...`);
    try {
      const kStats  = await measure(pq.offsetKnex);
      const gOff    = await measure(pq.offsetGuru);
      const gCur    = await measure(pq.cursorGuru);
      pagResults.push({ depth: pq.depth, offsetKnex: kStats, offsetGuru: gOff, cursorGuru: gCur });
      process.stdout.write(` knex-off=${kStats.median.toFixed(1)}  guru-off=${gOff.median.toFixed(1)}  guru-cur=${gCur.median.toFixed(1)} ms\n`);
    } catch(e) {
      process.stdout.write(` ERROR: ${e.message}\n`);
      const z = {median:0,p95:0,p99:0};
      pagResults.push({ depth: pq.depth, offsetKnex: z, offsetGuru: z, cursorGuru: z, error: e.message });
    }
  }

  printPaginationTable(pagResults);

  await kx.destroy();
  await capsule.getConnection().disconnect?.().catch(() => {});
}

main().catch(e => { console.error(e); process.exit(1); });

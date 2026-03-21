'use strict';
const { Client } = require('pg');
const copyFrom = require('pg-copy-streams').from;

const DB = { host:'localhost', port:5432, database:'guruorm_bench', user:'egmnz' };

let _s = 0xDEADBEEF;
const rng  = () => { _s^=_s<<13;_s^=_s>>17;_s^=_s<<5; return (_s>>>0)/0xFFFFFFFF; };
const ri   = (a,b) => (((rng()*(b-a+1))|0)+a);
const rf   = (a,b,d=2) => (rng()*(b-a)+a).toFixed(d);
const rp   = (a) => a[(rng()*a.length)|0];
const fmtTs= (d) => d.toISOString().replace('T',' ').slice(0,-1)+'+00';
const rDate= (s,e) => new Date(s.getTime()+rng()*(e.getTime()-s.getTime()));
const esc  = (s) => s==null?'\\N':String(s).replace(/\t/g,' ').replace(/\n/g,' ');

function wPick(arr,w) {
  let r=rng(),c=0;
  for(let i=0;i<arr.length;i++){ c+=w[i]; if(r<c) return arr[i]; }
  return arr[arr.length-1];
}

function pgCopy(client, sql, fillFn) {
  return new Promise((resolve, reject) => {
    const stream = client.query(copyFrom(sql));
    stream.on('error', reject);
    stream.on('finish', resolve);
    const CHUNK = 4 * 1024 * 1024; // 4 MB flush threshold
    let buf = '';
    const flush = (force) => {
      if (force || buf.length >= CHUNK) { stream.write(buf); buf = ''; }
    };
    const row = (line) => { buf += line + '\n'; flush(false); };
    fillFn(row);
    flush(true);
    stream.end();
  });
}

const COUNTRIES=[['US','United States'],['GB','United Kingdom'],['DE','Germany'],['FR','France'],['JP','Japan'],['CN','China'],['IN','India'],['BR','Brazil'],['AU','Australia'],['CA','Canada'],['MX','Mexico'],['ES','Spain'],['IT','Italy'],['KR','South Korea'],['RU','Russia'],['ZA','South Africa'],['NG','Nigeria'],['EG','Egypt'],['SA','Saudi Arabia'],['AE','UAE'],['SG','Singapore'],['TH','Thailand'],['ID','Indonesia'],['MY','Malaysia'],['PH','Philippines'],['VN','Vietnam'],['PK','Pakistan'],['BD','Bangladesh'],['NL','Netherlands'],['SE','Sweden'],['NO','Norway'],['DK','Denmark'],['FI','Finland'],['PL','Poland'],['PT','Portugal'],['GR','Greece'],['TR','Turkey'],['AR','Argentina'],['CL','Chile'],['CO','Colombia'],['PE','Peru'],['NZ','New Zealand'],['CH','Switzerland'],['AT','Austria'],['BE','Belgium'],['CZ','Czech Republic'],['HU','Hungary'],['RO','Romania'],['UA','Ukraine'],['IL','Israel']];
const FIRST=['Liam','Emma','Noah','Olivia','William','Ava','James','Sophia','Oliver','Isabella','Benjamin','Mia','Elijah','Charlotte','Lucas','Amelia','Mason','Harper','Logan','Evelyn','Amir','Priya','Arjun','Fatima','Chen','Wei','Yuki','Hiroshi','Diego','Sofia'];
const LAST =['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Lee','White','Harris','Thompson','Young','Hall','Walker','King','Scott','Green'];
const STATUSES=['pending','confirmed','shipped','delivered','cancelled','refunded'];
const STAT_W=[0.05,0.10,0.15,0.50,0.15,0.05];
const METHODS=['credit_card','debit_card','paypal','bank_transfer','crypto'];
const ADJ  =['Premium','Deluxe','Ultra','Pro','Classic','Essential','Advanced','Super','Mega','Elite'];
const NOUNS=['Widget','Gadget','Device','Item','Product','Unit','Module','Component','Kit','Set'];
const RTITLES=['Great product','Highly recommend','Amazing quality','Value for money','Solid build','Good but pricey','Exceeded expectations','Would buy again'];
const ROOTS=['Electronics','Clothing','Home Garden','Sports','Books','Toys','Beauty','Food','Automotive','Jewelry'];
const SUBS={
  'Electronics':['Phones','Laptops','Tablets','Audio','Cameras','TVs','Gaming','Accessories'],
  'Clothing':['Men','Women','Kids','Shoes','Bags','Watches','Sunglasses','Hats'],
  'Home Garden':['Furniture','Kitchen','Bedding','Lighting','Tools','Garden','Decor','Bath'],
  'Sports':['Running','Cycling','Swimming','Gym','Outdoor','Team Sports','Martial Arts','Yoga'],
  'Books':['Fiction','Non-Fiction','Science','History','Biography','Technology','Children','Comics'],
  'Toys':['Action Figures','Board Games','Dolls','LEGO','Puzzles','Educational','Outdoor Play','Electronic'],
  'Beauty':['Skincare','Makeup','Hair','Fragrance','Nail','Mens Grooming','Natural','Tools'],
  'Food':['Snacks','Beverages','Organic','Frozen','Bakery','Dairy','Meat','Seafood'],
  'Automotive':['Parts','Accessories','Tools','Care','Electronics','Fluids','Tires','Safety'],
  'Jewelry':['Rings','Necklaces','Earrings','Bracelets','Watches','Anklets','Brooches','Sets'],
};

async function seed() {
  const client = new Client(DB);
  await client.connect();
  console.log('\n🚀 Connected to guruorm_bench — fast seed starting...\n');
  const T0 = Date.now();
  const log = (m) => console.log(`  [${((Date.now()-T0)/1000).toFixed(1)}s] ${m}`);

  log('Truncating all tables...');
  await client.query(`TRUNCATE payments,reviews,order_items,orders,product_tags,product_images,products,addresses,users,tags,categories,countries RESTART IDENTITY CASCADE`);
  log('Truncated');

  // ── Countries
  for(let i=0;i<COUNTRIES.length;i++)
    await client.query('INSERT INTO countries(id,code,name) VALUES($1,$2,$3)',[i+1,...COUNTRIES[i]]);
  await client.query(`SELECT setval('countries_id_seq',${COUNTRIES.length})`);
  log(`${COUNTRIES.length} countries`);

  // ── Categories
  let catId = 1;
  for(const root of ROOTS){
    await client.query('INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)',[catId,root,root.toLowerCase().replace(/\s+/g,'-')]);
    const rid = catId++;
    for(const sub of (SUBS[root]||[])){
      await client.query('INSERT INTO categories(id,parent_id,name,slug) VALUES($1,$2,$3,$4)',[catId,rid,sub,(root+'-'+sub).toLowerCase().replace(/\s+/g,'-')]);
      catId++;
    }
  }
  const NUM_CATS = catId - 1;
  await client.query(`SELECT setval('categories_id_seq',${NUM_CATS})`);
  log(`${NUM_CATS} categories`);

  // ── Tags
  const TNAMES=['new','sale','featured','bestseller','trending','eco-friendly','handmade','imported','local','premium','budget','limited','bundle','refurbished','certified','organic','vegan','wireless','waterproof','lightweight','durable','portable','smart','vintage','modern','classic','luxury','gift','exclusive','hot-deal'];
  for(let i=0;i<TNAMES.length;i++)
    await client.query('INSERT INTO tags(id,name) VALUES($1,$2)',[i+1,TNAMES[i]]);
  const NUM_TAGS = TNAMES.length;
  await client.query(`SELECT setval('tags_id_seq',${NUM_TAGS})`);
  log(`${NUM_TAGS} tags`);

  const NC = COUNTRIES.length;
  const D0 = new Date('2018-01-01'), D1 = new Date('2026-01-01'), D2 = new Date('2020-01-01');

  // ── Users 100k
  const NUM_U = 100000;
  await pgCopy(client,
    `COPY users(id,name,email,password_hash,country_id,is_active,role,created_at,updated_at) FROM STDIN (FORMAT text,DELIMITER '\t',NULL '\\N')`,
    (row) => {
      for(let i=1;i<=NUM_U;i++){
        const ts = fmtTs(rDate(D0,D1));
        const role = i<=2000?'seller':i<=2100?'admin':'customer';
        row(`${i}\t${esc(rp(FIRST)+' '+rp(LAST))}\tuser${i}@bench.io\thash${i}\t${ri(1,NC)}\tt\t${role}\t${ts}\t${ts}`);
      }
    }
  );
  await client.query(`SELECT setval('users_id_seq',${NUM_U})`);
  log(`${NUM_U.toLocaleString()} users`);

  // ── Products 50k
  const NUM_P = 50000;
  await pgCopy(client,
    `COPY products(id,seller_id,category_id,name,slug,description,price,cost,stock_qty,sku,weight_kg,is_active,created_at,updated_at) FROM STDIN (FORMAT text,DELIMITER '\t',NULL '\\N')`,
    (row) => {
      for(let i=1;i<=NUM_P;i++){
        const price = rf(1,2000);
        const cost  = rf(0.5, +price * 0.6);
        const ts    = fmtTs(rDate(new Date('2019-01-01'),D1));
        row(`${i}\t${ri(1,2000)}\t${ri(1,NUM_CATS)}\t${esc(rp(ADJ)+' '+rp(NOUNS)+' '+i)}\tprod-${i}\tDescription for product ${i}\t${price}\t${cost}\t${ri(0,999)}\tSKU${String(i).padStart(8,'0')}\t${rf(0.1,10)}\tt\t${ts}\t${ts}`);
      }
    }
  );
  await client.query(`SELECT setval('products_id_seq',${NUM_P})`);
  log(`${NUM_P.toLocaleString()} products`);

  // ── product_tags (1-4 tags per product)
  await pgCopy(client,
    `COPY product_tags(product_id,tag_id) FROM STDIN (FORMAT text,DELIMITER '\t',NULL '\\N')`,
    (row) => {
      for(let p=1;p<=NUM_P;p++){
        const n = ri(1,4);
        const s = new Set();
        for(let k=0;k<n;k++){ const t=ri(1,NUM_TAGS); if(!s.has(t)){s.add(t);row(`${p}\t${t}`);} }
      }
    }
  );
  log('product_tags');

  // ── Orders 500k
  const NUM_O = 500000;
  await pgCopy(client,
    `COPY orders(id,user_id,status,subtotal,tax,shipping_cost,total,currency,placed_at,created_at,updated_at) FROM STDIN (FORMAT text,DELIMITER '\t',NULL '\\N')`,
    (row) => {
      for(let i=1;i<=NUM_O;i++){
        const sub  = rf(5,3000);
        const tax  = (+sub * 0.08).toFixed(2);
        const ship = rf(0,30);
        const tot  = (+sub + +tax + +ship).toFixed(2);
        const ts   = fmtTs(rDate(D2,D1));
        row(`${i}\t${ri(1,NUM_U)}\t${wPick(STATUSES,STAT_W)}\t${sub}\t${tax}\t${ship}\t${tot}\tUSD\t${ts}\t${ts}\t${ts}`);
      }
    }
  );
  await client.query(`SELECT setval('orders_id_seq',${NUM_O})`);
  log(`${NUM_O.toLocaleString()} orders`);

  // ── Order items ~1.5M (avg 3 items/order)
  let oid = 1;
  await pgCopy(client,
    `COPY order_items(id,order_id,product_id,quantity,unit_price,discount,line_total,created_at) FROM STDIN (FORMAT text,DELIMITER '\t',NULL '\\N')`,
    (row) => {
      const ts = fmtTs(D2);
      for(let o=1;o<=NUM_O;o++){
        const n = ri(1,5);
        const s = new Set();
        for(let k=0;k<n;k++){
          const pid = ri(1,NUM_P);
          if(s.has(pid)) continue;
          s.add(pid);
          const qty  = ri(1,5);
          const price= rf(1,1500);
          const disc = rng()<0.2 ? rf(1,+price*0.3) : '0.00';
          const tot  = ((+price - +disc) * qty).toFixed(2);
          row(`${oid++}\t${o}\t${pid}\t${qty}\t${price}\t${disc}\t${tot}\t${ts}`);
        }
      }
    }
  );
  await client.query(`SELECT setval('order_items_id_seq',${oid-1})`);
  log(`${(oid-1).toLocaleString()} order_items`);

  // ── Reviews 300k (unique user+product pairs)
  let rev = 1;
  const NUM_R = 300000;
  await pgCopy(client,
    `COPY reviews(id,user_id,product_id,rating,title,body,is_verified,helpful,created_at) FROM STDIN (FORMAT text,DELIMITER '\t',NULL '\\N')`,
    (row) => {
      const seen = new Set();
      let  att   = 0;
      while(rev <= NUM_R && att < NUM_R * 6){
        att++;
        const u = ri(1,NUM_U), p = ri(1,NUM_P), k = u+'_'+p;
        if(seen.has(k)) continue;
        seen.add(k);
        const ts = fmtTs(rDate(D2,D1));
        const r  = ri(1,5);
        row(`${rev++}\t${u}\t${p}\t${r}\t${esc(rp(RTITLES))}\tDetailed review body for product ${p} by user ${u}.\t${rng()<0.6?'t':'f'}\t${ri(0,99)}\t${ts}`);
      }
    }
  );
  await client.query(`SELECT setval('reviews_id_seq',${rev-1})`);
  log(`${(rev-1).toLocaleString()} reviews`);

  // ── Payments (~85% of orders get a payment)
  let pid = 1;
  const PAY_ST = ['completed','pending','failed','refunded'];
  await pgCopy(client,
    `COPY payments(id,order_id,method,status,amount,currency,paid_at,created_at) FROM STDIN (FORMAT text,DELIMITER '\t',NULL '\\N')`,
    (row) => {
      for(let o=1;o<=NUM_O;o++){
        if(rng() < 0.85){
          const ts = fmtTs(rDate(D2,D1));
          row(`${pid++}\t${o}\t${rp(METHODS)}\t${rp(PAY_ST)}\t${rf(5,3000)}\tUSD\t${ts}\t${ts}`);
        }
      }
    }
  );
  await client.query(`SELECT setval('payments_id_seq',${pid-1})`);
  log(`${(pid-1).toLocaleString()} payments`);

  log('Running ANALYZE...');
  await client.query('ANALYZE');
  await client.end();

  const elapsed = ((Date.now()-T0)/1000).toFixed(1);
  console.log(`\n✅ Seeding complete in ${elapsed}s\n`);

  // ── Row count summary
  const c2 = new Client(DB);
  await c2.connect();
  console.log('Table              Rows');
  console.log('─'.repeat(35));
  for(const t of ['countries','categories','tags','users','products','product_tags','orders','order_items','reviews','payments']){
    const { rows } = await c2.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`${t.padEnd(20)} ${(+rows[0].count).toLocaleString().padStart(12)}`);
  }
  await c2.end();
}

seed().catch(e => { console.error(e); process.exit(1); });

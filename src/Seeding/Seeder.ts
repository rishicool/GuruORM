import { Model } from '../Eloquent/Model';
import { Manager } from '../Capsule/Manager';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seeder base class
 * Inspired by Laravel's Seeder
 */
export abstract class Seeder {
  /**
   * The database connection that should be used
   */
  protected connection?: string;

  /**
   * Run the database seeds
   */
  abstract run(): Promise<void>;

  /**
   * Call another seeder
   */
  protected async call(seederClass: new () => Seeder | Seeder[] | Array<new () => Seeder>): Promise<void> {
    // Handle array of seeders
    if (Array.isArray(seederClass)) {
      for (const SeederClass of seederClass) {
        const seeder = new SeederClass();
        await seeder.run();
      }
      return;
    }

    // Handle single seeder
    const seeder = new (seederClass as new () => Seeder)();
    await seeder.run();
  }

  /**
   * Silence model events when running the seeder
   */
  protected async callWith<T>(
    seederClass: new () => Seeder,
    options: { silent?: boolean } = {}
  ): Promise<void> {
    if (options.silent) {
      await Model.withoutEvents(async () => {
        await this.call(seederClass);
      });
    } else {
      await this.call(seederClass);
    }
  }

  /**
   * Get the connection name for the seeder
   */
  getConnection(): string | undefined {
    return this.connection;
  }
}

/**
 * DatabaseSeeder - main seeder class
 */
export class DatabaseSeeder extends Seeder {
  /**
   * Run the database seeds
   */
  async run(): Promise<void> {
    // Override this method in your DatabaseSeeder
    console.log('DatabaseSeeder.run() - Override this method to seed your database');
  }
}

/**
 * JSONSeeder - Base class for seeders that load data from JSON files
 * Provides data loading, transformation, and batch insertion
 * 
 * Usage:
 * ```typescript
 * export default class UsersSeeder extends JSONSeeder {
 *   constructor() {
 *     super('users', 'users');
 *   }
 * }
 * ```
 */
export abstract class JSONSeeder extends Seeder {
  protected tableName: string;
  protected jsonFileName: string;
  protected seedsPath: string;
  protected force: boolean = false;

  constructor(tableName: string, jsonFileName: string, seedsPath?: string) {
    super();
    this.tableName = tableName;
    this.jsonFileName = jsonFileName;
    this.seedsPath = seedsPath || path.join(process.cwd(), 'database', 'seeds', 'data');
  }

  async run(force: boolean = false): Promise<void> {
    this.force = force;
    try {
      // Load seed data
      const data = this.loadSeedData();
      
      if (!data || data.length === 0) {
        console.log(`⚠️  No data found in ${this.jsonFileName}`);
        return;
      }

      // Check if data already exists (basic duplicate prevention)
      if (!this.force) {
        const existingCount = await this.getTableCount();
        if (existingCount > 0) {
          console.log(`⏭️  Skipping ${this.tableName}: Data already exists`);
          return;
        }
      }

      // Insert data
      await this.insertData(data);
      console.log(`✅ Seeded ${data.length} records into ${this.tableName}`);
    } catch (error: any) {
      console.error(`❌ Error seeding ${this.tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get count of records in table
   */
  protected async getTableCount(): Promise<number> {
    const manager = Manager.getInstance();
    const connection = manager.getConnection();
    const result = await connection.table(this.tableName).count();
    return typeof result === 'number' ? result : (Array.isArray(result) ? result.length : 0);
  }

  /**
   * Load seed data from JSON file
   */
  protected loadSeedData(): any[] | null {
    const jsonPath = path.join(this.seedsPath, `${this.jsonFileName}.json`);

    if (!fs.existsSync(jsonPath)) {
      console.log(`⚠️  JSON file not found: ${jsonPath}`);
      return null;
    }

    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return null;
    }

    return rawData.map(doc => this.transform(doc));
  }

  /**
   * Insert data in batches
   */
  protected async insertData(data: any[]): Promise<void> {
    console.log(`Seeding ${this.tableName}: ${data.length} records...`);

    const manager = Manager.getInstance();
    const connection = manager.getConnection();

    // Normalize batch - ensure all rows have same keys
    const allKeys = new Set<string>();
    data.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
    const normalized = data.map(row => {
      const norm: any = {};
      allKeys.forEach(k => norm[k] = row[k] ?? null);
      return norm;
    });

    const batchSize = 100;
    for (let i = 0; i < normalized.length; i += batchSize) {
      const batch = normalized.slice(i, i + batchSize);
      await connection.table(this.tableName).insert(batch);
      console.log(`  ${Math.min(i + batchSize, normalized.length)}/${normalized.length}`);
    }
  }

  /**
   * Transform data before insertion
   * Override this method in child classes for custom transformations
   */
  protected transform(doc: any): any {
    const row: any = {};
    for (const [key, value] of Object.entries(doc)) {
      // Skip MongoDB metadata fields
      if (key === '__v' || key === 'mongodb_id' || key === '_id') continue;

      // Convert camelCase to snake_case
      const field = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

      // Handle ID field - ONLY accept valid UUIDs
      if (field === 'id') {
        if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          row[field] = value;
        }
        continue;
      }

      // Reject MongoDB ObjectIDs
      if (typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value)) {
        console.warn(`⚠️  WARNING: MongoDB ObjectID detected in field '${field}': ${value}`);
        console.warn(`⚠️  This should be a UUID. Skipping field.`);
        continue;
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        row[field] = null;
      }
      // Handle objects (convert to JSON)
      else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        row[field] = JSON.stringify(value);
      }
      // Handle arrays (convert to JSON)
      else if (Array.isArray(value)) {
        const hasObjectIds = value.some(v => typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v));
        if (hasObjectIds) {
          console.warn(`⚠️  WARNING: Array in field '${field}' contains MongoDB ObjectIDs`);
          console.warn(`⚠️  These should be UUIDs. Skipping field.`);
          continue;
        }
        row[field] = JSON.stringify(value);
      }
      // Handle primitives
      else {
        row[field] = value;
      }
    }
    return row;
  }
}

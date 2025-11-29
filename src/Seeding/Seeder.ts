import { Model } from '../Eloquent/Model';

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

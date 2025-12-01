import { Builder as SchemaBuilder } from '../Schema/Builder';
import { Manager } from '../Capsule/Manager';

/**
 * Migration base class
 * Inspired by Laravel's Migration
 */
export abstract class Migration {
  /**
   * Schema builder instance
   */
  protected schema: SchemaBuilder;

  /**
   * The database connection that should be used by the migration
   */
  protected connection?: string;

  /**
   * Enables, if supported, wrapping the migration within a transaction
   */
  public withinTransaction = true;

  constructor() {
    // Get global capsule instance
    const capsule = Manager.getInstance();
    this.schema = capsule.schema();
  }

  /**
   * Run the migrations
   */
  abstract up(): Promise<void>;

  /**
   * Reverse the migrations
   */
  abstract down(): Promise<void>;

  /**
   * Get the migration connection name
   */
  getConnection(): string | undefined {
    return this.connection;
  }

  /**
   * Determine if the migration should run
   */
  shouldRun(): boolean {
    return true;
  }
}

/**
 * Migration base class - placeholder for future implementation
 * Inspired by Laravel's Migration
 */
export abstract class Migration {
  /**
   * Run the migrations
   */
  abstract up(): Promise<void>;

  /**
   * Reverse the migrations
   */
  abstract down(): Promise<void>;
}

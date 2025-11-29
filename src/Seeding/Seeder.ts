/**
 * Seeder base class - placeholder for future implementation
 * Inspired by Laravel's Seeder
 */
export abstract class Seeder {
  /**
   * Run the database seeds
   */
  abstract run(): Promise<void>;

  /**
   * Call another seeder
   */
  protected async call(seederClass: new () => Seeder): Promise<void> {
    const seeder = new seederClass();
    await seeder.run();
  }
}

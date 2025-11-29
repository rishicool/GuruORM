import { Factory } from '../src/Seeding/Factory';
import { User } from '../path/to/models/User';

export class UserfactoryFactory extends Factory<User> {
  /**
   * Define the model's default state.
   */
  definition(): Partial<User> {
    return {
      // Define your factory attributes here
      // Example:
      // name: 'Sample Name',
      // email: `user${Math.random()}@example.com`,
    };
  }
}

import { Schema } from '../../src';
import type { Blueprint } from '../../src';

export default class CreateTestTable {
  async up() {
    await Schema.create('test', (table: Blueprint) => {
      table.id();
      table.string('name');
      table.timestamps();
    });
  }

  async down() {
    await Schema.dropIfExists('test');
  }
}

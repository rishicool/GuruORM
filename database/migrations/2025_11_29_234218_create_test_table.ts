import { Schema } from '../../src';

export default class CreateTestTable {
  async up() {
    await Schema.create('test', (table) => {
      table.id();
      table.string('name');
      table.timestamps();
    });
  }

  async down() {
    await Schema.dropIfExists('test');
  }
}

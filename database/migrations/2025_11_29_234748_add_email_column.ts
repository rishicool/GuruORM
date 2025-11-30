import { Schema } from '../../src';

export default class AddEmailColumn {
  async up() {
    await Schema.table('test', (table) => {
      table.string('email').nullable();
    });
  }

  async down() {
    await Schema.table('test', (table) => {
      table.dropColumn('email');
    });
  }
}

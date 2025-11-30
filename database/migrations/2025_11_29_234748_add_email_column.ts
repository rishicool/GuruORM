import { Schema } from '../../src';
import type { Blueprint } from '../../src';

export default class AddEmailColumn {
  async up() {
    await Schema.table('test', (table: Blueprint) => {
      table.string('email').nullable();
    });
  }

  async down() {
    await Schema.table('test', (table: Blueprint) => {
      table.dropColumn('email');
    });
  }
}

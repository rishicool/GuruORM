export default class CreateUsersTable {
  async up() {
    // Schema.create implementation will be available in Phase 3
    // await Schema.create('users', (table) => {
    //   table.id();
    //   table.string('name');
    //   table.string('email').unique();
    //   table.timestamps();
    // });
  }

  async down() {
    // await Schema.dropIfExists('users');
  }
}

import * as fs from 'fs';
import * as path from 'path';
import { FactoryMaker } from '../../../src/CLI/FactoryMaker';
import { MigrationMaker } from '../../../src/CLI/MigrationMaker';
import { SeederMaker } from '../../../src/CLI/SeederMaker';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('FactoryMaker', () => {
  beforeEach(() => jest.clearAllMocks());

  test('create generates className, fileName, and contents', () => {
    mockFs.existsSync.mockReturnValue(false); // no stub file, use inline
    const maker = new FactoryMaker();
    const result = maker.create('User');
    expect(result.className).toBe('UserFactory');
    expect(result.fileName).toBe('UserFactory.ts');
    expect(result.contents).toContain('class UserFactory');
    expect(result.contents).toContain('User');
  });

  test('create strips existing Factory suffix', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new FactoryMaker();
    const result = maker.create('PostFactory');
    expect(result.className).toBe('PostFactory');
  });

  test('create uses custom model name', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new FactoryMaker();
    const result = maker.create('OrderFactory', 'PurchaseOrder');
    expect(result.contents).toContain('PurchaseOrder');
  });

  test('create uses stub file when exists', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('class {{class}} for {{model}}');
    const maker = new FactoryMaker();
    const result = maker.create('Item');
    expect(result.contents).toBe('class ItemFactory for Item');
  });

  test('handles kebab-case and underscore names', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new FactoryMaker();
    const result = maker.create('user-profile_item');
    expect(result.className).toBe('UserProfileItemFactory');
  });

  test('write creates directory and writes file', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined as any);
    mockFs.writeFileSync.mockReturnValue(undefined);
    const maker = new FactoryMaker();
    const fullPath = maker.write('/project/factories', 'UserFactory.ts', 'content');
    expect(fullPath).toBe(path.join('/project/factories', 'UserFactory.ts'));
    expect(mockFs.mkdirSync).toHaveBeenCalledWith('/project/factories', { recursive: true });
    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });

  test('write skips mkdir when dir exists', () => {
    mockFs.existsSync.mockReturnValue(true);
    const maker = new FactoryMaker();
    maker.write('/project/factories', 'UserFactory.ts', 'content');
    expect(mockFs.mkdirSync).not.toHaveBeenCalled();
  });
});

describe('MigrationMaker', () => {
  beforeEach(() => jest.clearAllMocks());

  test('create generates className and timestamped fileName', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new MigrationMaker();
    const result = maker.create('create_users_table');
    expect(result.className).toBe('CreateUsersTable');
    expect(result.fileName).toMatch(/^\d{4}_\d{2}_\d{2}_\d{6}_create_users_table\.js$/);
    expect(result.contents).toContain('CreateUsersTable');
  });

  test('create with explicit table name', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new MigrationMaker();
    const result = maker.create('my_migration', 'products');
    expect(result.contents).toContain('products');
  });

  test('create=true uses create stub with Schema.create', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new MigrationMaker();
    const result = maker.create('create_items_table', undefined, true);
    expect(result.contents).toContain('Schema.create');
    expect(result.contents).toContain('items');
  });

  test('create=false uses update stub with Schema.table', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new MigrationMaker();
    const result = maker.create('add_email_to_users');
    expect(result.contents).toContain('Schema.table');
    expect(result.contents).toContain('users');
  });

  test('guessTableName from create_X_table', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new MigrationMaker();
    const result = maker.create('create_orders_table');
    expect(result.contents).toContain('orders');
  });

  test('guessTableName from to_X pattern', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new MigrationMaker();
    const result = maker.create('add_col_to_products');
    expect(result.contents).toContain('products');
  });

  test('guessTableName from from_X pattern', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new MigrationMaker();
    const result = maker.create('remove_col_from_categories');
    expect(result.contents).toContain('categories');
  });

  test('uses stub file when exists', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('{{class}} on {{table}}');
    const maker = new MigrationMaker();
    const result = maker.create('test', 'foo');
    expect(result.contents).toBe('Test on foo');
  });

  test('write creates directory and writes file', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined as any);
    mockFs.writeFileSync.mockReturnValue(undefined);
    const maker = new MigrationMaker();
    const result = maker.write('/migs', 'file.js', 'sql');
    expect(result).toBe(path.join('/migs', 'file.js'));
    expect(mockFs.mkdirSync).toHaveBeenCalledWith('/migs', { recursive: true });
  });
});

describe('SeederMaker', () => {
  beforeEach(() => jest.clearAllMocks());

  test('create generates className and fileName', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new SeederMaker();
    const result = maker.create('User');
    expect(result.className).toBe('UserSeeder');
    expect(result.fileName).toBe('UserSeeder.js');
    expect(result.contents).toContain('class UserSeeder');
  });

  test('create strips existing Seeder suffix', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new SeederMaker();
    const result = maker.create('DatabaseSeeder');
    expect(result.className).toBe('DatabaseSeeder');
  });

  test('handles multi-word names', () => {
    mockFs.existsSync.mockReturnValue(false);
    const maker = new SeederMaker();
    const result = maker.create('user_profile');
    expect(result.className).toBe('UserProfileSeeder');
  });

  test('uses stub file when exists', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('hello {{class}}');
    const maker = new SeederMaker();
    const result = maker.create('Admin');
    expect(result.contents).toBe('hello AdminSeeder');
  });

  test('write creates directory and writes file', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined as any);
    mockFs.writeFileSync.mockReturnValue(undefined);
    const maker = new SeederMaker();
    const result = maker.write('/seeders', 'AdminSeeder.js', 'content');
    expect(result).toBe(path.join('/seeders', 'AdminSeeder.js'));
  });
});

import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration file generator
 */
export class MigrationMaker {
  protected stubPath: string;

  constructor(stubPath?: string) {
    this.stubPath = stubPath || path.join(__dirname, '../../stubs/migration.stub');
  }

  /**
   * Create a new migration file
   */
  create(name: string, tableName?: string, create: boolean = false): { fileName: string; contents: string; className: string } {
    const className = this.getClassName(name);
    const fileName = this.getFileName(name);
    const stub = this.getStub(create);
    
    // Auto-extract table name from migration name if not provided
    if (!tableName) {
      tableName = this.guessTableName(name);
    }
    
    const contents = this.populateStub(stub, className, tableName, create);
    
    return { fileName, contents, className };
  }
  
  /**
   * Guess the table name from the migration name
   */
  protected guessTableName(name: string): string {
    // Extract table name from patterns like:
    // create_users_table -> users
    // add_email_to_users -> users
    // create_products_table -> products
    
    const createMatch = name.match(/create[_-](\w+)[_-]table/i);
    if (createMatch) {
      return createMatch[1].toLowerCase();
    }
    
    const toMatch = name.match(/to[_-](\w+)/i);
    if (toMatch) {
      return toMatch[1].toLowerCase();
    }
    
    const fromMatch = name.match(/from[_-](\w+)/i);
    if (fromMatch) {
      return fromMatch[1].toLowerCase();
    }
    
    // Default: use the whole name as table name
    return name.toLowerCase().replace(/[_-]/g, '_');
  }

  /**
   * Get the class name for the migration
   */
  protected getClassName(name: string): string {
    // Convert snake_case or kebab-case to PascalCase
    return name
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Get the file name for the migration
   */
  protected getFileName(name: string): string {
    const timestamp = this.getDatePrefix();
    const snakeCaseName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `${timestamp}_${snakeCaseName}.js`;
  }

  /**
   * Get the date prefix for the migration
   */
  protected getDatePrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}_${month}_${day}_${hours}${minutes}${seconds}`;
  }

  /**
   * Get the migration stub file
   */
  protected getStub(create: boolean): string {
    if (fs.existsSync(this.stubPath)) {
      return fs.readFileSync(this.stubPath, 'utf-8');
    }
    
    // Fallback to inline stub if file doesn't exist
    if (create) {
      return this.getCreateStub();
    }
    
    return this.getUpdateStub();
  }

  /**
   * Populate the stub with actual values
   */
  protected populateStub(stub: string, className: string, tableName?: string, create: boolean = false): string {
    let contents = stub.replace(/{{class}}/g, className);
    
    if (tableName) {
      contents = contents.replace(/{{table}}/g, tableName);
    }
    
    return contents;
  }

  /**
   * Get the create table stub
   */
  protected getCreateStub(): string {
    return `import { Schema } from 'guruorm';

export default class {{class}} {
  async up() {
    await Schema.create('{{table}}', (table) => {
      table.id();
      table.timestamps();
    });
  }

  async down() {
    await Schema.dropIfExists('{{table}}');
  }
}
`;
  }

  /**
   * Get the update table stub
   */
  protected getUpdateStub(): string {
    return `import { Schema } from 'guruorm';

export default class {{class}} {
  async up() {
    await Schema.table('{{table}}', (table) => {
      // Add your columns here
    });
  }

  async down() {
    await Schema.table('{{table}}', (table) => {
      // Remove your columns here
    });
  }
}
`;
  }

  /**
   * Write the migration file to disk
   */
  write(filePath: string, fileName: string, contents: string): string {
    const fullPath = path.join(filePath, fileName);
    
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, contents);
    
    return fullPath;
  }
}

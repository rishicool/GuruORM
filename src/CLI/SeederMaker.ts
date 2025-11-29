import * as fs from 'fs';
import * as path from 'path';

/**
 * Seeder file generator
 */
export class SeederMaker {
  protected stubPath: string;

  constructor(stubPath?: string) {
    this.stubPath = stubPath || path.join(__dirname, '../../stubs/seeder.stub');
  }

  /**
   * Create a new seeder file
   */
  create(name: string): { fileName: string; contents: string; className: string } {
    const className = this.getClassName(name);
    const fileName = this.getFileName(name);
    const stub = this.getStub();
    
    const contents = this.populateStub(stub, className);
    
    return { fileName, contents, className };
  }

  /**
   * Get the class name for the seeder
   */
  protected getClassName(name: string): string {
    // Ensure it ends with 'Seeder'
    let className = name
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    if (!className.endsWith('Seeder')) {
      className += 'Seeder';
    }
    
    return className;
  }

  /**
   * Get the file name for the seeder
   */
  protected getFileName(name: string): string {
    const className = this.getClassName(name);
    return `${className}.ts`;
  }

  /**
   * Get the seeder stub file
   */
  protected getStub(): string {
    if (fs.existsSync(this.stubPath)) {
      return fs.readFileSync(this.stubPath, 'utf-8');
    }
    
    // Fallback to inline stub
    return this.getInlineStub();
  }

  /**
   * Populate the stub with actual values
   */
  protected populateStub(stub: string, className: string): string {
    return stub.replace(/{{class}}/g, className);
  }

  /**
   * Get the inline seeder stub
   */
  protected getInlineStub(): string {
    return `import { Seeder } from '../src/Seeding/Seeder';

export class {{class}} extends Seeder {
  /**
   * Run the database seeds.
   */
  async run(): Promise<void> {
    // Add your seeding logic here
    // Example:
    // await User.create({ name: 'John Doe', email: 'john@example.com' });
  }
}
`;
  }

  /**
   * Write the seeder file to disk
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

import * as fs from 'fs';
import * as path from 'path';

/**
 * Factory file generator
 */
export class FactoryMaker {
  protected stubPath: string;

  constructor(stubPath?: string) {
    this.stubPath = stubPath || path.join(__dirname, '../../stubs/factory.stub');
  }

  /**
   * Create a new factory file
   */
  create(name: string, modelName?: string): { fileName: string; contents: string; className: string } {
    const className = this.getClassName(name);
    const fileName = this.getFileName(name);
    const model = modelName || name.replace(/Factory$/, '');
    const stub = this.getStub();
    
    const contents = this.populateStub(stub, className, model);
    
    return { fileName, contents, className };
  }

  /**
   * Get the class name for the factory
   */
  protected getClassName(name: string): string {
    let className = name
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    if (!className.endsWith('Factory')) {
      className += 'Factory';
    }
    
    return className;
  }

  /**
   * Get the file name for the factory
   */
  protected getFileName(name: string): string {
    const className = this.getClassName(name);
    return `${className}.ts`;
  }

  /**
   * Get the factory stub file
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
  protected populateStub(stub: string, className: string, modelName: string): string {
    let contents = stub.replace(/{{class}}/g, className);
    contents = contents.replace(/{{model}}/g, modelName);
    return contents;
  }

  /**
   * Get the inline factory stub
   */
  protected getInlineStub(): string {
    return `import { Factory } from '../src/Seeding/Factory';
import { {{model}} } from '../path/to/models/{{model}}';

export class {{class}} extends Factory<{{model}}> {
  /**
   * Define the model's default state.
   */
  definition(): Partial<{{model}}> {
    return {
      // Define your factory attributes here
      // Example:
      // name: 'Sample Name',
      // email: \`user\${Math.random()}@example.com\`,
    };
  }
}
`;
  }

  /**
   * Write the factory file to disk
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

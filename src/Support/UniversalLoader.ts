import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Universal Module Loader
 * Loads modules regardless of format (CJS, ESM, MJS, TS)
 * Auto-detects and handles all cases
 */
export class UniversalLoader {
  /**
   * Load a module file universally
   * Supports: .cjs, .mjs, .js (ESM or CJS), .ts
   */
  static async loadModule(filePath: string): Promise<any> {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Module not found: ${absolutePath}`);
    }

    const ext = path.extname(absolutePath);
    
    // TypeScript files - try to compile or load compiled version
    if (ext === '.ts') {
      return this.loadTypeScriptModule(absolutePath);
    }
    
    // .mjs is always ESM
    if (ext === '.mjs') {
      return this.loadESMModule(absolutePath);
    }
    
    // .cjs is always CommonJS
    if (ext === '.cjs') {
      return this.loadCJSModule(absolutePath);
    }
    
    // .js - need to detect if ESM or CJS
    if (ext === '.js') {
      return this.loadJSModule(absolutePath);
    }
    
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  /**
   * Load ESM module using dynamic import
   */
  private static async loadESMModule(filePath: string): Promise<any> {
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const module = await import(fileUrl);
      return module.default || module;
    } catch (error: any) {
      throw new Error(`Failed to load ESM module ${filePath}: ${error.message}`);
    }
  }

  /**
   * Load CommonJS module using require
   */
  private static loadCJSModule(filePath: string): any {
    try {
      // Use dynamic import.meta.url wrapped in any to avoid TS errors
      const require = createRequire(__filename);
      // Clear cache to allow reloading
      delete require.cache[require.resolve(filePath)];
      return require(filePath);
    } catch (error: any) {
      throw new Error(`Failed to load CJS module ${filePath}: ${error.message}`);
    }
  }

  /**
   * Load .js file - auto-detect if ESM or CJS
   */
  private static async loadJSModule(filePath: string): Promise<any> {
    // Check if project uses "type": "module"
    const isESM = this.isESMProject(filePath);
    
    if (isESM) {
      // Try ESM first, fallback to CJS
      try {
        return await this.loadESMModule(filePath);
      } catch (esmError: any) {
        try {
          return this.loadCJSModule(filePath);
        } catch (cjsError: any) {
          throw new Error(`Failed to load module ${filePath}:\n  ESM: ${esmError.message}\n  CJS: ${cjsError.message}`);
        }
      }
    } else {
      // Try CJS first, fallback to ESM
      try {
        return this.loadCJSModule(filePath);
      } catch (cjsError: any) {
        try {
          return await this.loadESMModule(filePath);
        } catch (esmError: any) {
          throw new Error(`Failed to load module ${filePath}:\n  CJS: ${cjsError.message}\n  ESM: ${esmError.message}`);
        }
      }
    }
  }

  /**
   * Load TypeScript module
   */
  private static async loadTypeScriptModule(filePath: string): Promise<any> {
    // Check if there's a compiled .js version
    const jsPath = filePath.replace(/\.ts$/, '.js');
    if (fs.existsSync(jsPath)) {
      return this.loadJSModule(jsPath);
    }
    
    throw new Error(`TypeScript file ${filePath} has no compiled .js version. Please compile it first.`);
  }

  /**
   * Check if a file is in an ESM project
   * Walks up directory tree looking for package.json with "type": "module"
   */
  private static isESMProject(filePath: string): boolean {
    let dir = path.dirname(filePath);
    
    while (dir !== path.dirname(dir)) { // Stop at root
      const pkgPath = path.join(dir, 'package.json');
      
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          return pkg.type === 'module';
        } catch {
          // Invalid package.json, continue searching
        }
      }
      
      dir = path.dirname(dir);
    }
    
    // Default to CJS if no package.json found
    return false;
  }

  /**
   * Find and load config file
   * Searches for config in multiple formats: .cjs, .js, .mjs
   */
  static async loadConfig(configName: string, searchDir: string = process.cwd()): Promise<any> {
    const extensions = ['.cjs', '.js', '.mjs'];
    
    for (const ext of extensions) {
      const configPath = path.join(searchDir, `${configName}${ext}`);
      if (fs.existsSync(configPath)) {
        return this.loadModule(configPath);
      }
    }
    
    throw new Error(`Config file not found: ${configName} in ${searchDir}`);
  }
}

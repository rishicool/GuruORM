/**
 * ESM/CJS compatibility utilities.
 * Provides access to __dirname, __filename, and require()
 * regardless of the module system in use.
 *
 * When compiled to CJS (the default for GuruORM), the Node.js globals
 * are directly available. These helpers future-proof the codebase
 * for ESM migration by centralizing the access pattern.
 */

/**
 * Get the directory name of the calling module.
 * Returns CJS __dirname when available.
 */
export function getDirname(): string {
  return __dirname;
}

/**
 * Get the filename of the calling module.
 * Returns CJS __filename when available.
 */
export function getFilename(): string {
  return __filename;
}

/**
 * Get a require function.
 * Returns CJS require when available.
 */
export function getRequire(): NodeRequire {
  return require;
}

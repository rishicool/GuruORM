import { Builder } from '../Builder';

/**
 * Base Processor class - inspired by Laravel and Illuminate
 * Processes the results of database queries
 */
export class Processor {
  /**
   * Process the results of a "select" query
   */
  processSelect(query: Builder, results: any[]): any[] {
    return results;
  }

  /**
   * Process an "insert get ID" query
   */
  processInsertGetId(query: Builder, sql: string, values: any[], sequence?: string): Promise<number> {
    throw new Error('processInsertGetId not implemented for this database driver');
  }

  /**
   * Process the results of a column listing query
   */
  processColumnListing(results: any[]): string[] {
    return results.map((result) => Object.values(result)[0] as string);
  }
}

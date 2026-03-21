/**
 * Query logger for tracking database queries.
 * Uses a configurable ring buffer to prevent unbounded memory growth.
 */
export class QueryLogger {
  private static enabled = false;
  private static queries: QueryLog[] = [];
  private static listeners: QueryListener[] = [];
  private static maxSize: number = 1000;

  /**
   * Enable query logging
   */
  static enable(): void {
    this.enabled = true;
  }

  /**
   * Disable query logging
   */
  static disable(): void {
    this.enabled = false;
  }

  /**
   * Check if logging is enabled
   */
  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set the maximum number of queries to retain in the log.
   * Oldest queries are evicted when the limit is reached.
   */
  static setMaxSize(size: number): void {
    this.maxSize = Math.max(1, size);
    // Trim if current log exceeds new limit
    while (this.queries.length > this.maxSize) {
      this.queries.shift();
    }
  }

  /**
   * Get the current max size
   */
  static getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Log a query
   */
  static log(sql: string, bindings: any[] = [], time: number = 0, connection: string = 'default'): void {
    if (!this.enabled) {
      return;
    }

    const queryLog: QueryLog = {
      sql,
      bindings,
      time,
      connection,
      timestamp: new Date()
    };

    // Evict oldest entry if at capacity
    if (this.queries.length >= this.maxSize) {
      this.queries.shift();
    }

    this.queries.push(queryLog);

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(queryLog);
      } catch (error) {
        console.error('Query listener error:', error);
      }
    }
  }

  /**
   * Get all logged queries
   */
  static getQueryLog(): QueryLog[] {
    return [...this.queries];
  }

  /**
   * Flush (clear) the query log
   */
  static flushQueryLog(): void {
    this.queries = [];
  }

  /**
   * Listen to query events
   */
  static listen(listener: QueryListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a query listener
   */
  static removeListener(listener: QueryListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get total query time
   */
  static getTotalTime(): number {
    return this.queries.reduce((total, query) => total + query.time, 0);
  }

  /**
   * Get query count
   */
  static getQueryCount(): number {
    return this.queries.length;
  }

  /**
   * Get slow queries (over threshold in ms)
   */
  static getSlowQueries(threshold: number = 100): QueryLog[] {
    return this.queries.filter(query => query.time > threshold);
  }

  /**
   * Pretty print query log
   */
  static prettyPrint(): void {
    console.log('\n=== Query Log ===');
    console.log(`Total Queries: ${this.getQueryCount()}`);
    console.log(`Total Time: ${this.getTotalTime().toFixed(2)}ms\n`);

    this.queries.forEach((query, index) => {
      console.log(`[${index + 1}] ${query.sql}`);
      if (query.bindings.length > 0) {
        console.log(`    Bindings: ${JSON.stringify(query.bindings)}`);
      }
      console.log(`    Time: ${query.time.toFixed(2)}ms`);
      console.log(`    Connection: ${query.connection}`);
      console.log('');
    });
  }
}

/**
 * Query log entry interface
 */
export interface QueryLog {
  sql: string;
  bindings: any[];
  time: number;
  connection: string;
  timestamp: Date;
}

/**
 * Query listener function type
 */
export type QueryListener = (query: QueryLog) => void;

/**
 * Database manager with query logging support
 */
export class DB {
  /**
   * Enable query logging
   */
  static enableQueryLog(): void {
    QueryLogger.enable();
  }

  /**
   * Disable query logging
   */
  static disableQueryLog(): void {
    QueryLogger.disable();
  }

  /**
   * Get query log
   */
  static getQueryLog(): QueryLog[] {
    return QueryLogger.getQueryLog();
  }

  /**
   * Flush query log
   */
  static flushQueryLog(): void {
    QueryLogger.flushQueryLog();
  }

  /**
   * Listen to query events
   */
  static listen(listener: QueryListener): void {
    QueryLogger.listen(listener);
  }

  /**
   * Pretty print query log
   */
  static prettyPrint(): void {
    QueryLogger.prettyPrint();
  }
}

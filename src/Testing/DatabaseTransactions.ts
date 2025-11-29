import { Connection } from '../Connection/Connection';

/**
 * DatabaseTransactions trait equivalent for testing
 * Wraps each test in a database transaction and rolls back after
 */
export class DatabaseTransactions {
  protected connection?: Connection;
  protected transactionStarted: boolean = false;

  /**
   * Set the database connection
   */
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /**
   * Begin a database transaction before the test
   */
  async beginDatabaseTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection must be set before beginning transaction');
    }

    await this.connection.beginTransaction();
    this.transactionStarted = true;
  }

  /**
   * Rollback the database transaction after the test
   */
  async rollbackDatabaseTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection must be set before rolling back transaction');
    }

    if (this.transactionStarted) {
      await this.connection.rollback();
      this.transactionStarted = false;
    }
  }

  /**
   * Check if a transaction is currently active
   */
  isTransactionActive(): boolean {
    return this.transactionStarted;
  }

  /**
   * Get the current transaction level
   */
  getTransactionLevel(): number {
    if (!this.connection) {
      return 0;
    }
    return this.connection.transactionLevel();
  }
}

/**
 * Helper function to create a DatabaseTransactions instance
 */
export function createDatabaseTransactions(connection: Connection): DatabaseTransactions {
  const transactions = new DatabaseTransactions();
  transactions.setConnection(connection);
  return transactions;
}

/**
 * Decorator for test methods to automatically wrap in transactions
 */
export function WithTransaction(connection: Connection) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      await connection.beginTransaction();
      
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        await connection.rollback();
      }
    };

    return descriptor;
  };
}

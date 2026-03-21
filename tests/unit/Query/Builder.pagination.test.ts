import { describe, it, expect } from '@jest/globals';
import { createBuilder } from '../../helpers/MockConnection';

describe('Query / Builder — pagination', () => {

  // ── forPage / limit / offset ─────────────────────────

  describe('forPage', () => {
    it('sets correct offset and limit for page 1', () => {
      const { builder } = createBuilder('users');
      builder.forPage(1, 10);
      const sql = builder.toSql();
      expect(sql).toContain('limit 10');
    });

    it('calculates offset for page 3', () => {
      const { builder } = createBuilder('users');
      builder.forPage(3, 15);
      const sql = builder.toSql();
      expect(sql).toContain('limit 15');
      expect(sql).toContain('offset 30');
    });
  });

  describe('limit', () => {
    it('sets the limit', () => {
      const { builder } = createBuilder('users');
      builder.limit(5);
      expect(builder.toSql()).toContain('limit 5');
    });
  });

  describe('take', () => {
    it('is an alias for limit', () => {
      const { builder } = createBuilder('users');
      builder.take(10);
      expect(builder.toSql()).toContain('limit 10');
    });
  });

  describe('offset', () => {
    it('sets the offset', () => {
      const { builder } = createBuilder('users');
      builder.offset(20);
      expect(builder.toSql()).toContain('offset 20');
    });
  });

  describe('skip', () => {
    it('is an alias for offset', () => {
      const { builder } = createBuilder('users');
      builder.skip(5);
      expect(builder.toSql()).toContain('offset 5');
    });
  });

  // ── paginate ─────────────────────────────────────────

  describe('paginate', () => {
    it('returns paginated result with total', async () => {
      const { builder, connection } = createBuilder('users');

      // First call is for count, second for data
      connection.select
        .mockResolvedValueOnce([{ 'count(*)': 50 }])
        .mockResolvedValueOnce([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ]);

      const result = await builder.paginate(2, 1);

      expect(result.total).toBe(50);
      expect(result.perPage).toBe(2);
      expect(result.currentPage).toBe(1);
      expect(result.lastPage).toBe(25);
      expect(result.data).toHaveLength(2);
    });

    it('calculates lastPage correctly', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select
        .mockResolvedValueOnce([{ 'count(*)': 7 }])
        .mockResolvedValueOnce([{ id: 1 }]);

      const result = await builder.paginate(3);
      expect(result.lastPage).toBe(3); // Math.ceil(7 / 3)
    });
  });

  // ── simplePaginate ──────────────────────────────────

  describe('simplePaginate', () => {
    it('returns hasMore=true when more records exist', async () => {
      const { builder, connection } = createBuilder('users');
      // Request perPage=2, connection returns 3 (extra one)
      connection.select.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);

      const result = await builder.simplePaginate(2, 1);

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.currentPage).toBe(1);
    });

    it('returns hasMore=false on last page', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 5 }]);

      const result = await builder.simplePaginate(2, 3);

      expect(result.hasMore).toBe(false);
      expect(result.data).toHaveLength(1);
    });
  });

  // ── cursorPaginate ──────────────────────────────────

  describe('cursorPaginate', () => {
    it('returns data with nextCursor when more exist', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
      ]);

      const result = await builder.cursorPaginate(2);

      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.nextCursor).toBeTruthy();
      expect(result.prevCursor).toBeNull();
    });

    it('nextCursor is null when no more', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select.mockResolvedValue([{ id: 1 }]);

      const result = await builder.cursorPaginate(2);

      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });

  // ── chunk / chunkById ────────────────────────────────

  describe('chunk', () => {
    it('iterates through pages', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([{ id: 3 }])
        .mockResolvedValueOnce([]);

      const pages: number[] = [];
      await builder.chunk(2, (results, page) => {
        pages.push(page);
      });

      expect(pages).toEqual([1, 2]);
    });

    it('stops early when callback returns false', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([{ id: 2 }]);

      const result = await builder.chunk(1, () => false);
      expect(result).toBe(false);
    });
  });

  describe('chunkById', () => {
    it('chunks by id column', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([{ id: 3 }])
        .mockResolvedValueOnce([]);

      const allIds: number[] = [];
      await builder.chunkById(2, (results) => {
        results.forEach((r: any) => allIds.push(r.id));
      });

      expect(allIds).toEqual([1, 2, 3]);
    });
  });

  // ── lazy / lazyById ─────────────────────────────────

  describe('lazy', () => {
    it('yields all records across chunks', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([]);

      const items = [];
      for await (const item of builder.lazy(2)) {
        items.push(item);
      }

      expect(items).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('lazyById', () => {
    it('yields records using cursor-style id batching', async () => {
      const { builder, connection } = createBuilder('users');
      connection.select
        .mockResolvedValueOnce([{ id: 10 }, { id: 20 }])
        .mockResolvedValueOnce([]);

      const items = [];
      for await (const item of builder.lazyById(2)) {
        items.push(item);
      }

      expect(items).toEqual([{ id: 10 }, { id: 20 }]);
    });
  });
});

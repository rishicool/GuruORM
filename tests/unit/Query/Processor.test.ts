import { Processor } from '../../../src/Query/Processors/Processor';

describe('Query / Processor', () => {
  let processor: Processor;

  beforeEach(() => {
    processor = new Processor();
  });

  describe('processSelect', () => {
    test('returns results unchanged', () => {
      const results = [{ id: 1 }, { id: 2 }];
      expect(processor.processSelect({} as any, results)).toBe(results);
    });

    test('handles empty results', () => {
      expect(processor.processSelect({} as any, [])).toEqual([]);
    });
  });

  describe('processInsertGetId', () => {
    test('throws not implemented error', () => {
      expect(() => processor.processInsertGetId({} as any, 'INSERT INTO...', []))
        .toThrow('processInsertGetId not implemented');
    });
  });

  describe('processColumnListing', () => {
    test('extracts first value from each result', () => {
      const results = [{ Field: 'id' }, { Field: 'name' }, { Field: 'email' }];
      expect(processor.processColumnListing(results)).toEqual(['id', 'name', 'email']);
    });

    test('handles empty results', () => {
      expect(processor.processColumnListing([])).toEqual([]);
    });
  });
});

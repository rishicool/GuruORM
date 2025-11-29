import { describe, it, expect } from '@jest/globals';
import { Collection } from '../../src/Support/Collection';

describe('Collection', () => {
  it('should create a collection', () => {
    const collection = Collection.make([1, 2, 3]);
    expect(collection.count()).toBe(3);
  });

  it('should map over items', () => {
    const collection = Collection.make([1, 2, 3]);
    const mapped = collection.map((item) => item * 2);
    expect(Array.from(mapped)).toEqual([2, 4, 6]);
  });

  it('should filter items', () => {
    const collection = Collection.make([1, 2, 3, 4, 5]);
    const filtered = collection.filter((item) => item > 2);
    expect(Array.from(filtered)).toEqual([3, 4, 5]);
  });

  it('should get first item', () => {
    const collection = Collection.make([1, 2, 3]);
    expect(collection.first()).toBe(1);
  });

  it('should get last item', () => {
    const collection = Collection.make([1, 2, 3]);
    expect(collection.last()).toBe(3);
  });

  it('should check if empty', () => {
    const empty = Collection.make([]);
    const notEmpty = Collection.make([1]);
    expect(empty.isEmpty()).toBe(true);
    expect(notEmpty.isEmpty()).toBe(false);
  });

  it('should calculate sum', () => {
    const collection = Collection.make([1, 2, 3, 4, 5]);
    expect(collection.sum()).toBe(15);
  });

  it('should calculate average', () => {
    const collection = Collection.make([1, 2, 3, 4, 5]);
    expect(collection.avg()).toBe(3);
  });

  it('should get unique items', () => {
    const collection = Collection.make([1, 2, 2, 3, 3, 3]);
    const unique = collection.unique();
    expect(unique.toArray()).toEqual([1, 2, 3]);
  });

  it('should chunk collection', () => {
    const collection = Collection.make([1, 2, 3, 4, 5]);
    const chunked = collection.chunk(2);
    expect(chunked.count()).toBe(3);
    expect(chunked.first()?.toArray()).toEqual([1, 2]);
  });
});

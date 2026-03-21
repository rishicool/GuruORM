import { ObserverRegistry, Observer } from '../../../src/Eloquent/Observer';

describe('Eloquent / ObserverRegistry', () => {
  afterEach(() => {
    ObserverRegistry.clearObservers('TestModel');
    ObserverRegistry.clearObservers('OtherModel');
  });

  describe('observe / getObservers', () => {
    test('registers and retrieves observers', () => {
      const obs: Observer = { created: jest.fn() };
      ObserverRegistry.observe('TestModel', obs);
      expect(ObserverRegistry.getObservers('TestModel')).toEqual([obs]);
    });

    test('returns empty array for unregistered model', () => {
      expect(ObserverRegistry.getObservers('Unknown')).toEqual([]);
    });

    test('supports multiple observers', () => {
      const obs1: Observer = { creating: jest.fn() };
      const obs2: Observer = { updating: jest.fn() };
      ObserverRegistry.observe('TestModel', obs1);
      ObserverRegistry.observe('TestModel', obs2);
      expect(ObserverRegistry.getObservers('TestModel')).toHaveLength(2);
    });
  });

  describe('clearObservers', () => {
    test('removes all observers for a model', () => {
      ObserverRegistry.observe('TestModel', { created: jest.fn() });
      ObserverRegistry.clearObservers('TestModel');
      expect(ObserverRegistry.getObservers('TestModel')).toEqual([]);
    });

    test('does not affect other models', () => {
      const obs: Observer = { created: jest.fn() };
      ObserverRegistry.observe('TestModel', obs);
      ObserverRegistry.observe('OtherModel', { created: jest.fn() });
      ObserverRegistry.clearObservers('TestModel');
      expect(ObserverRegistry.getObservers('OtherModel')).toHaveLength(1);
    });
  });

  describe('callObservers', () => {
    test('calls observer method for event', async () => {
      const creating = jest.fn();
      ObserverRegistry.observe('TestModel', { creating });
      await ObserverRegistry.callObservers('TestModel', 'creating', {} as any);
      expect(creating).toHaveBeenCalledTimes(1);
    });

    test('passes model to observer method', async () => {
      const saved = jest.fn();
      const model = { id: 1 } as any;
      ObserverRegistry.observe('TestModel', { saved });
      await ObserverRegistry.callObservers('TestModel', 'saved', model);
      expect(saved).toHaveBeenCalledWith(model);
    });

    test('returns false when observer returns false', async () => {
      const creating = jest.fn().mockReturnValue(false);
      ObserverRegistry.observe('TestModel', { creating });
      const result = await ObserverRegistry.callObservers('TestModel', 'creating', {} as any);
      expect(result).toBe(false);
    });

    test('continues chain when observer does not return false', async () => {
      const obs1 = { creating: jest.fn().mockReturnValue(undefined) };
      const obs2 = { creating: jest.fn() };
      ObserverRegistry.observe('TestModel', obs1);
      ObserverRegistry.observe('TestModel', obs2);
      await ObserverRegistry.callObservers('TestModel', 'creating', {} as any);
      expect(obs2.creating).toHaveBeenCalled();
    });

    test('stops chain when observer returns false', async () => {
      const obs1 = { creating: jest.fn().mockReturnValue(false) };
      const obs2 = { creating: jest.fn() };
      ObserverRegistry.observe('TestModel', obs1);
      ObserverRegistry.observe('TestModel', obs2);
      await ObserverRegistry.callObservers('TestModel', 'creating', {} as any);
      expect(obs2.creating).not.toHaveBeenCalled();
    });

    test('handles async observer methods', async () => {
      const creating = jest.fn().mockResolvedValue(undefined);
      ObserverRegistry.observe('TestModel', { creating });
      await ObserverRegistry.callObservers('TestModel', 'creating', {} as any);
      expect(creating).toHaveBeenCalled();
    });

    test('no-ops when no observers exist', async () => {
      const result = await ObserverRegistry.callObservers('TestModel', 'creating', {} as any);
      expect(result).toBeUndefined();
    });

    test('skips events not defined on observer', async () => {
      ObserverRegistry.observe('TestModel', { created: jest.fn() });
      // calling 'deleting' which is not defined on this observer
      await expect(ObserverRegistry.callObservers('TestModel', 'deleting', {} as any)).resolves.not.toThrow();
    });
  });
});

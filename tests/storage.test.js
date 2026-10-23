/**
 * storage.test.js — Unit tests for storage utility functions
 *
 * Tests cover:
 * - loadFromStorage: absent key returns null (Requirement 4.3)
 * - loadFromStorage: malformed JSON returns null and removes the key (Requirement 4.4)
 * - saveToStorage: no-op (no throw) when localStorage throws on setItem (Requirement 4.5)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadFromStorage, saveToStorage, storageAvailable } from '../js/app.js';

describe('loadFromStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when the key is absent', () => {
    const result = loadFromStorage('nonexistent-key');
    expect(result).toBeNull();
  });

  it('returns the parsed value when a valid JSON string is stored', () => {
    localStorage.setItem('tasks', JSON.stringify([{ id: '1', description: 'Test', completed: false }]));
    const result = loadFromStorage('tasks');
    expect(result).toEqual([{ id: '1', description: 'Test', completed: false }]);
  });

  it('returns null and removes the key when the stored value is malformed JSON', () => {
    localStorage.setItem('tasks', 'this is {not valid JSON]');
    const result = loadFromStorage('tasks');

    expect(result).toBeNull();
    // The corrupted entry should have been removed from localStorage
    expect(localStorage.getItem('tasks')).toBeNull();
  });

  it('returns null and removes the key for a partially valid but non-parseable value', () => {
    localStorage.setItem('links', '{unclosed');
    const result = loadFromStorage('links');

    expect(result).toBeNull();
    expect(localStorage.getItem('links')).toBeNull();
  });
});

describe('saveToStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists a value that can be retrieved via loadFromStorage', () => {
    saveToStorage('tasks', [{ id: '42', description: 'Hello', completed: true }]);
    const result = loadFromStorage('tasks');
    expect(result).toEqual([{ id: '42', description: 'Hello', completed: true }]);
  });

  it('overwrites a previously stored value', () => {
    saveToStorage('tasks', ['first']);
    saveToStorage('tasks', ['second']);
    expect(loadFromStorage('tasks')).toEqual(['second']);
  });

  it('becomes a no-op (does not throw) when localStorage.setItem throws', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    // Should not throw — the function handles the error internally
    expect(() => saveToStorage('tasks', [{ id: '1' }])).not.toThrow();
  });


});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadWatchlist,
  saveWatchlist,
  loadCompareTickers,
  saveCompareTickers,
  DEFAULT_WATCHLIST,
} from '../storageManager.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
});

describe('loadWatchlist', () => {
  it('returns DEFAULT_WATCHLIST when nothing is stored', () => {
    const result = loadWatchlist();
    expect(result).toEqual(DEFAULT_WATCHLIST);
  });

  it('returns stored watchlist when valid data exists', () => {
    const stored = ['AAPL', 'MSFT'];
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(stored));
    expect(loadWatchlist()).toEqual(stored);
  });

  it('returns default for corrupted data', () => {
    localStorageMock.getItem.mockReturnValueOnce('not-json{');
    expect(loadWatchlist()).toEqual(DEFAULT_WATCHLIST);
  });

  it('returns default for empty array', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));
    expect(loadWatchlist()).toEqual(DEFAULT_WATCHLIST);
  });

  it('returns default for non-array', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ a: 1 }));
    expect(loadWatchlist()).toEqual(DEFAULT_WATCHLIST);
  });
});

describe('saveWatchlist', () => {
  it('serializes correctly to localStorage', () => {
    const tickers = ['AAPL', 'GOOGL'];
    saveWatchlist(tickers);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'carlos-watchlist',
      JSON.stringify(tickers)
    );
  });
});

describe('loadCompareTickers', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadCompareTickers()).toEqual([]);
  });

  it('returns stored tickers', () => {
    const stored = ['AAPL', 'MSFT'];
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(stored));
    expect(loadCompareTickers()).toEqual(stored);
  });

  it('returns empty array for corrupted data', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid');
    expect(loadCompareTickers()).toEqual([]);
  });
});

describe('saveCompareTickers', () => {
  it('serializes correctly', () => {
    const tickers = ['AAPL'];
    saveCompareTickers(tickers);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'carlos-compare-tickers',
      JSON.stringify(tickers)
    );
  });
});

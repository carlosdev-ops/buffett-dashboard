import { describe, it, expect } from 'vitest';
import { parseCSVLine, parseNumber, parseStocksCSV } from '../dataExport.js';

describe('parseCSVLine', () => {
  it('splits a simple CSV line', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields', () => {
    expect(parseCSVLine('"hello",world')).toEqual(['hello', 'world']);
  });

  it('handles commas inside quotes', () => {
    expect(parseCSVLine('"a,b",c')).toEqual(['a,b', 'c']);
  });

  it('trims whitespace', () => {
    expect(parseCSVLine(' a , b , c ')).toEqual(['a', 'b', 'c']);
  });

  it('handles empty fields', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c']);
  });

  it('handles single field', () => {
    expect(parseCSVLine('hello')).toEqual(['hello']);
  });
});

describe('parseNumber', () => {
  it('parses valid numbers', () => {
    expect(parseNumber('42')).toBe(42);
    expect(parseNumber('3.14')).toBeCloseTo(3.14);
    expect(parseNumber('-5')).toBe(-5);
  });

  it('returns null for empty string', () => {
    expect(parseNumber('')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
  });

  it('returns null for NAN string', () => {
    expect(parseNumber('NaN')).toBeNull();
    expect(parseNumber('NAN')).toBeNull();
    expect(parseNumber('nan')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('parseStocksCSV', () => {
  it('parses CSV with headers and data', () => {
    const csv = 'ticker,name,price\nAAPL,Apple,150.5\nMSFT,Microsoft,300';
    const result = parseStocksCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].ticker).toBe('AAPL');
    expect(result[0].name).toBe('Apple');
    expect(result[0].price).toBe(150.5);
    expect(result[1].ticker).toBe('MSFT');
    expect(result[1].price).toBe(300);
  });

  it('returns empty array for empty CSV', () => {
    expect(parseStocksCSV('')).toEqual([]);
  });

  it('returns empty array for headers only', () => {
    expect(parseStocksCSV('ticker,name,price')).toEqual([]);
  });

  it('handles NaN values', () => {
    const csv = 'ticker,price\nAAPL,NaN';
    const result = parseStocksCSV(csv);
    expect(result[0].price).toBeNull();
  });
});

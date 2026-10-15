import { describe, it, expect } from 'vitest';
import { getRegisteredAdapters, getAdapter, isAdapterEnabled } from '@/lib/adapters/types';
import '@/lib/adapters/openfoodfacts';

describe('Adapter Registry', () => {
  it('registers the Open Food Facts adapter as enabled', () => {
    const adapters = getRegisteredAdapters();
    const off = adapters.find((a) => a.adapter.slug === 'open-food-facts');
    expect(off).toBeDefined();
    expect(off!.enabled).toBe(true);
  });

  it('registers affiliate feed adapters as disabled', () => {
    expect(isAdapterEnabled('amazon-india-affiliate')).toBe(false);
    expect(isAdapterEnabled('flipkart-affiliate')).toBe(false);
  });

  it('registers brand catalog adapters as disabled', () => {
    expect(isAdapterEnabled('myprotein-brand-catalog')).toBe(false);
    expect(isAdapterEnabled('optimum-nutrition-brand-catalog')).toBe(false);
  });

  it('returns undefined for unknown adapter slug', () => {
    expect(getAdapter('nonexistent')).toBeUndefined();
  });

  it('disabled adapters report isConfigured as false', () => {
    const amazon = getAdapter('amazon-india-affiliate');
    expect(amazon).toBeDefined();
    expect(amazon!.adapter.isConfigured()).toBe(false);
  });

  it('disabled adapters healthCheck reports not configured', async () => {
    const amazon = getAdapter('amazon-india-affiliate');
    const result = await amazon!.adapter.healthCheck();
    expect(result.healthy).toBe(false);
    expect(result.message).toContain('not configured');
  });
});

describe('Open Food Facts Adapter', () => {
  it('reports isConfigured as true (public API)', () => {
    const off = getAdapter('open-food-facts');
    expect(off).toBeDefined();
    expect(off!.adapter.isConfigured()).toBe(true);
  });

  it('has correct slug and name', () => {
    const off = getAdapter('open-food-facts');
    expect(off!.adapter.slug).toBe('open-food-facts');
    expect(off!.adapter.name).toBe('Open Food Facts');
  });
});

import { generateScheduleString } from '../src/utils/scheduleString';
import { describe, it, expect } from 'vitest';

describe('generateScheduleString', () => {
  it('generates daily default', () => {
    expect(generateScheduleString({ type: 'daily' }))
      .toBe('FREQ=DAILY;INTERVAL=1');
  });

  it('generates daily with custom interval', () => {
    expect(generateScheduleString({ type: 'daily', interval: 3 }))
      .toBe('FREQ=DAILY;INTERVAL=3');
  });

  it('generates every_x_days', () => {
    expect(generateScheduleString({ type: 'every_x_days', interval: 2 }))
      .toBe('FREQ=DAILY;INTERVAL=2');
  });

  it('generates weekly default', () => {
    expect(generateScheduleString({ type: 'weekly' }))
      .toBe('FREQ=WEEKLY;INTERVAL=1');
  });

  it('generates weekly with specific days', () => {
    expect(generateScheduleString({ 
      type: 'weekly', 
      byDays: ['MO', 'WE', 'FR'] 
    }))
      .toBe('FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR');
  });

  it('generates weekly with interval and days', () => {
    expect(generateScheduleString({ 
      type: 'weekly', 
      interval: 2,
      byDays: ['MO', 'FR'] 
    }))
      .toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR');
  });

  it('generates custom_days', () => {
    expect(generateScheduleString({ 
      type: 'custom_days', 
      byDays: ['TU', 'TH', 'SA'] 
    }))
      .toBe('FREQ=WEEKLY;BYDAY=TU,TH,SA');
  });

  it('handles custom_days without days', () => {
    expect(generateScheduleString({ type: 'custom_days' }))
      .toBe('FREQ=WEEKLY;INTERVAL=1');
  });

  it('handles invalid type gracefully', () => {
    expect(generateScheduleString({ type: 'invalid' as any }))
      .toBe('FREQ=DAILY;INTERVAL=1');
  });
});
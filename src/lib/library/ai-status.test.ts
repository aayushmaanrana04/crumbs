import { describe, expect, it } from 'vitest';
import type { Job } from '../db/schema';
import { aiStatus, overallState } from './ai-status';

const job = (type: Job['type'], status: Job['status'], error?: string): Job => ({
  id: type, type, docId: 'd', status, attempts: 0, runAfter: 0, createdAt: 0, error,
});

describe('aiStatus', () => {
  const both = ['insights', 'embed'] as const;

  it('reports done when results exist and nothing is pending', () => {
    const s = aiStatus({ jobs: [], hasInsight: true, hasEmbeddings: true, activeTypes: [...both] });
    expect(s).toMatchObject({ insights: 'done', embed: 'done' });
    expect(overallState(s)).toBe('done');
  });

  it('shows running and failed jobs with their error', () => {
    const s = aiStatus({ jobs: [job('insights', 'running'), job('embed', 'failed', 'HTTP 500')], hasInsight: false, hasEmbeddings: false, activeTypes: [...both] });
    expect(s).toEqual({ insights: 'running', embed: 'failed', error: 'HTTP 500' });
    expect(overallState(s)).toBe('running');
  });

  it('treats queued jobs for unconfigured tasks as off, not pending', () => {
    const s = aiStatus({ jobs: [job('insights', 'queued'), job('embed', 'queued')], hasInsight: false, hasEmbeddings: false, activeTypes: ['insights'] });
    expect(s).toMatchObject({ insights: 'queued', embed: 'off' });
  });

  it('keeps an earlier result visible when its task is turned off', () => {
    const s = aiStatus({ jobs: [job('insights', 'queued')], hasInsight: true, hasEmbeddings: false, activeTypes: [] });
    expect(s.insights).toBe('done');
  });

  it('flags configured tasks that never ran', () => {
    expect(aiStatus({ jobs: [], hasInsight: false, hasEmbeddings: false, activeTypes: [...both] }).insights).toBe('missing');
  });
});

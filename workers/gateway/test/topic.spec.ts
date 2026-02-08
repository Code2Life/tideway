import { describe, expect, it } from 'vitest'

import { parseTopicHeader } from '../src/lib/topic'

describe('parseTopicHeader', () => {
  it('parses comma separated topics and trims values', () => {
    expect(parseTopicHeader(' alpha,beta , gamma ')).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('deduplicates topics while keeping first-seen order', () => {
    expect(parseTopicHeader('alerts,alerts,metrics,alerts')).toEqual(['alerts', 'metrics'])
  })

  it('throws when the topic header is missing', () => {
    expect(() => parseTopicHeader(null)).toThrow('x-sse-topic header is required')
  })

  it('throws when any topic value is blank', () => {
    expect(() => parseTopicHeader('alerts,,metrics')).toThrow('x-sse-topic contains empty topic value')
  })
})

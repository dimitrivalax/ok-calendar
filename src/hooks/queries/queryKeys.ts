export const queryKeys = {
  calendars: {
    all: ['calendars'] as const,
  },
  events: {
    all: ['events'] as const,
    window: (start: string, end: string, visibleIdsKey: string) =>
      ['events', 'window', start, end, visibleIdsKey] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
    searchCorpus: (visibleIdsKey: string) =>
      ['events', 'searchCorpus', visibleIdsKey] as const,
  },
  settings: {
    all: ['settings'] as const,
    digests: ['settings', 'digests'] as const,
    backgroundSync: ['settings', 'backgroundSync'] as const,
  },
} as const;

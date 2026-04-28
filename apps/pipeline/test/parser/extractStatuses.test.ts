import { describe, expect, it } from 'vitest'
import { extractStatuses } from 'dcss-morgue-parser'

describe('extractStatuses', () => {
  it('extracts wrapped status lines and preserves detail text', () => {
    const text = [
      '%: no passive effects',
      '@: resistant, sick, fragile (+50% incoming damage), enshackling, ephemerally',
      'shielded, wreathed by umbra, studying 3 skills',
      'A: icemail 2, condensation shield, ephemeral shield, [reckless]',
    ].join('\n')

    expect(extractStatuses(text)).toEqual({
      statusText: 'resistant, sick, fragile (+50% incoming damage), enshackling, ephemerally shielded, wreathed by umbra, studying 3 skills',
      statuses: [
        { display: 'resistant', id: null },
        { display: 'sick', id: null },
        { display: 'fragile (+50% incoming damage)', id: null },
        { display: 'enshackling', id: null },
        { display: 'ephemerally shielded', id: 'ephemeral_shield' },
        { display: 'wreathed by umbra', id: null },
        { display: 'studying 3 skills', id: null },
      ],
    })
  })

  it('returns an empty status list for no current statuses', () => {
    expect(extractStatuses('@: no status effects\nA: no striking features')).toEqual({
      statusText: 'no status effects',
      statuses: [],
    })
  })
})

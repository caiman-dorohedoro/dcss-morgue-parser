import { describe, expect, it } from 'vitest'
import { KNOWN_STATUS_IDS, extractStatuses } from 'dcss-morgue-parser'

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
        { display: 'ephemerally shielded', id: KNOWN_STATUS_IDS.ephemeralShield },
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

  it('normalizes stat-affecting statuses and parses displayed status values', () => {
    expect(
      extractStatuses(
        [
          '@: sanguine armoured, acrobatic, fiery-armoured, protected from physical damage,',
          'parry, corroded (-4), trickster (+12 AC), vertigo',
          'A: sanguine armour 3, trickster',
        ].join('\n'),
      ),
    ).toEqual({
      statusText:
        'sanguine armoured, acrobatic, fiery-armoured, protected from physical damage, parry, corroded (-4), trickster (+12 AC), vertigo',
      statuses: [
        { display: 'sanguine armoured', id: KNOWN_STATUS_IDS.sanguineArmoured },
        { display: 'acrobatic', id: KNOWN_STATUS_IDS.acrobatic },
        { display: 'fiery-armoured', id: KNOWN_STATUS_IDS.fieryArmour },
        {
          display: 'protected from physical damage',
          id: KNOWN_STATUS_IDS.protectedFromPhysicalDamage,
        },
        { display: 'parry', id: KNOWN_STATUS_IDS.parrying },
        { display: 'corroded (-4)', id: KNOWN_STATUS_IDS.corrosion, values: { corrosion: -4 } },
        { display: 'trickster (+12 AC)', id: KNOWN_STATUS_IDS.trickster, values: { ac: 12 } },
        { display: 'vertigo', id: KNOWN_STATUS_IDS.vertigo },
      ],
    })
  })

  it('exports the status id vocabulary used by parsed status entries', () => {
    expect(KNOWN_STATUS_IDS).toEqual({
      acrobatic: 'acrobatic',
      corrosion: 'corrosion',
      ephemeralShield: 'ephemeral_shield',
      fieryArmour: 'fiery_armour',
      icyArmour: 'icy_armour',
      icemailDepleted: 'icemail_depleted',
      parrying: 'parrying',
      protectedFromPhysicalDamage: 'protected_from_physical_damage',
      sanguineArmoured: 'sanguine_armoured',
      trickster: 'trickster',
      vertigo: 'vertigo',
    })
  })
})

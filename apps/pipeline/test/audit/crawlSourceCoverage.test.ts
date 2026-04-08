import { describe, expect, it } from 'vitest'
import {
  extractGodNames,
  parsePlayableJobYaml,
  parsePlayableSpeciesYaml,
  preprocessByTagMajor,
} from '../../src/audit/crawlSourceCoverage'

describe('crawlSourceCoverage', () => {
  it('parses playable jobs and ignores disabled or mismatched yaml entries', () => {
    expect(
      parsePlayableJobYaml(
        [
          'enum: JOB_FIGHTER',
          'name: "Fighter"',
          'recommended_species:',
          '  - minotaur',
        ].join('\n'),
        35,
      ),
    ).toMatchObject({
      name: 'Fighter',
      isPlayable: true,
    })

    expect(
      parsePlayableJobYaml(
        [
          'TAG_MAJOR_VERSION: 34',
          'enum: JOB_PRIEST',
          'name: "Priest"',
          'recommended_species:',
          '  - hill orc',
        ].join('\n'),
        35,
      ),
    ).toBeNull()

    expect(
      parsePlayableJobYaml(
        [
          'enum: JOB_OLD',
          'name: "Old Job"',
          'difficulty: false',
        ].join('\n'),
        34,
      ),
    ).toMatchObject({
      name: 'Old Job',
      isPlayable: false,
    })
  })

  it('parses playable species and respects TAG_MAJOR_VERSION gates', () => {
    expect(
      parsePlayableSpeciesYaml(
        [
          'enum: SP_MINOTAUR',
          'name: Minotaur',
          'recommended_jobs:',
          '  - fighter',
        ].join('\n'),
        35,
      ),
    ).toMatchObject({
      name: 'Minotaur',
      isPlayable: true,
    })

    expect(
      parsePlayableSpeciesYaml(
        [
          'TAG_MAJOR_VERSION: 34',
          'enum: SP_DEPRECATED',
          'name: Deprecated',
          'recommended_jobs:',
          '  - fighter',
        ].join('\n'),
        35,
      ),
    ).toBeNull()
  })

  it('filters TAG_MAJOR_VERSION source blocks before extracting god names', () => {
    const godType = [
      'enum god_type',
      '{',
      '    GOD_NO_GOD = 0,',
      '    GOD_ZIN,',
      '#if TAG_MAJOR_VERSION == 34',
      '    GOD_PAKELLAS,',
      '#endif',
      '    GOD_IGNIS,',
      '    GOD_JIYVA,',
      '    NUM_GODS,',
      '};',
    ].join('\n')
    const religion = [
      'switch (which_god)',
      '{',
      'case GOD_NO_GOD: return "No God";',
      'case GOD_ZIN: return "Zin";',
      '#if TAG_MAJOR_VERSION == 34',
      'case GOD_PAKELLAS: return "Pakellas";',
      '#endif',
      'case GOD_IGNIS: return "Ignis";',
      'case GOD_JIYVA: return "an unknown god";',
      '}',
    ].join('\n')

    expect(preprocessByTagMajor(religion, 35)).not.toContain('Pakellas')
    expect(extractGodNames(godType, religion, 35)).toEqual(['Ignis', 'Jiyva', 'Zin'])
    expect(extractGodNames(godType, religion, 34)).toEqual(['Ignis', 'Jiyva', 'Pakellas', 'Zin'])
  })
})

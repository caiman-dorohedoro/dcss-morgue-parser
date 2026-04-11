import { describe, expect, it } from 'vitest'
import { extractForm } from '../../../../packages/parser/src/extractForm'

const TALISMAN_FORM_CASES = [
  ['quill talisman', 'quill-form'],
  ['inkwell talisman', 'scroll-form'],
  ['rimehorn talisman', 'yak-form'],
  ['spider talisman', 'spider-form'],
  ['wellspring talisman', 'aqua-form'],
  ['scarab talisman', 'scarab-form'],
  ['medusa talisman', 'medusa-form'],
  ['spore talisman', 'spore-form'],
  ['maw talisman', 'maw-form'],
  ['serpent talisman', 'amphisbaena-form'],
  ['eel talisman', 'eel hands'],
  ['blade talisman', 'blade-form'],
  ['lupine talisman', 'werewolf-form'],
  ['fortress talisman', 'crab-form'],
  ['granite talisman', 'statue-form'],
  ['hive talisman', 'hive-form'],
  ['dragon-coil talisman', 'dragon-form'],
  ['riddle talisman', 'sphinx-form'],
  ['sanguine talisman', 'vampire-form'],
  ['death talisman', 'death-form'],
  ['storm talisman', 'storm-form'],
] as const

describe('extractForm', () => {
  it.each(TALISMAN_FORM_CASES)(
    'maps equipped %s to %s when no explicit status-form token is present',
    (equippedTalismanBaseType, expectedForm) => {
      const parsed = extractForm(`%: no passive effects
@: mighty, studying Ice Magic
Inventory:`, {
        equippedTalismanBaseType,
      })

      expect(parsed).toEqual({
        form: expectedForm,
      })
    },
  )

  it('captures non -form status labels from the current status line', () => {
    const parsed = extractForm(`%: guardian spirit
@: mighty, eel hands, on eeljolt cooldown, lightly drained
You had electric eels for hands.`)

    expect(parsed).toEqual({
      form: 'eel hands',
    })
  })

  it('falls back to the overview prose when the status line does not include a form token', () => {
    const parsed = extractForm(`%: no passive effects
@: mighty, studying 4 skills, very slow
You are a living statue of rough stone.

Inventory:`)

    expect(parsed).toEqual({
      form: 'statue-form',
    })
  })

  it('uses the equipped talisman as a more stable fallback than overview prose', () => {
    const parsed = extractForm(`%: no passive effects
@: mighty, flying, studying Ice Magic
You are a fearsome dragon.

Inventory:`, {
      equippedTalismanBaseType: 'dragon-coil talisman',
    })

    expect(parsed).toEqual({
      form: 'dragon-form',
    })
  })
})

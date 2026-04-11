import { describe, expect, it } from 'vitest'
import { extractForm } from '../../../../packages/parser/src/extractForm'

describe('extractForm', () => {
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

import { describe, expect, it } from 'vitest'
import type { EquipmentItemSnapshot } from 'dcss-morgue-parser'
import { summarizePropertyBag } from './viewerHelpers'

describe('summarizePropertyBag', () => {
  it('includes gizmo effect tags alongside ordinary properties', () => {
    const item: EquipmentItemSnapshot = {
      rawName: 'recursive megaformer',
      displayName: 'recursive megaformer',
      objectClass: 'gizmo',
      equipState: 'installed',
      isCursed: false,
      baseType: 'gizmo',
      enchant: null,
      artifactKind: 'randart',
      ego: null,
      subtypeEffect: null,
      gizmoEffects: ['SpellMotor'],
      propertiesText: 'SpellMotor, MP+4 Wiz Slay+3',
      properties: {
        numeric: {
          MP: 4,
          Slay: 3,
        },
        booleanProps: {
          Wiz: true,
        },
        opaqueTokens: [],
      },
      intrinsicProperties: {
        numeric: {},
        booleanProps: {},
        opaqueTokens: [],
      },
      egoProperties: {
        numeric: {},
        booleanProps: {},
        opaqueTokens: [],
      },
      artifactProperties: {
        numeric: {
          MP: 4,
          Slay: 3,
        },
        booleanProps: {
          Wiz: true,
        },
        opaqueTokens: [],
      },
    }

    expect(summarizePropertyBag(item)).toEqual([
      'MP +4',
      'Slay +3',
      'Wiz',
      'SpellMotor',
    ])
  })
})

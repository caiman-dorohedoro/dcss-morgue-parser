import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractEquipment } from '../../src/parser/extractEquipment'
import type { EquipmentPropertyBag } from '../../src/types'

function loadFixture(directory: 'focused' | 'full', name: string) {
  return readFileSync(
    path.resolve(process.cwd(), `../../fixtures/morgue/${directory}/${name}`),
    'utf8',
  )
}

function bag(input: Partial<EquipmentPropertyBag> = {}): EquipmentPropertyBag {
  return {
    numeric: input.numeric ?? {},
    flags: input.flags ?? {},
    specials: input.specials ?? [],
  }
}

describe('extractEquipment', () => {
  it('keeps none for missing primary slots while parsing simple aux armour items', () => {
    const parsed = extractEquipment(loadFixture('focused', 'body-armour-none.txt'))

    expect(parsed.bodyArmour).toBe('none')
    expect(parsed.shield).toBe('none')
    expect(parsed.footwear).toEqual(['pair of boots'])
    expect(parsed.helmets).toEqual(['hat'])
    expect(parsed.gloves).toEqual(['pair of gloves'])
    expect(parsed.cloaks).toEqual(['cloak'])

    expect(parsed.footwearDetails?.[0]).toMatchObject({
      objectClass: 'armour',
      equipState: 'worn',
      isCursed: false,
      baseType: 'boots',
      enchant: 0,
      artifactKind: 'normal',
      ego: null,
      properties: bag(),
    })
  })

  it('infers normal armour egos from explicit names and terse morgue stats', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-midori369-20260406-191652.txt'))

    expect(parsed.shield).toBe('buckler of cold resistance')
    expect(parsed.footwear).toEqual(['pair of boots of flying'])
    expect(parsed.helmets).toEqual(['hat of intelligence'])
    expect(parsed.cloaks).toEqual(['cloak of willpower'])

    expect(parsed.shieldDetails).toMatchObject({
      objectClass: 'armour',
      equipState: 'worn',
      isCursed: false,
      baseType: 'buckler',
      enchant: 3,
      artifactKind: 'normal',
      ego: 'cold resistance',
      properties: bag({ numeric: { rC: 1 } }),
      egoProperties: bag({ numeric: { rC: 1 } }),
      artifactProperties: bag(),
    })

    expect(parsed.footwearDetails?.[0]).toMatchObject({
      baseType: 'boots',
      ego: 'flying',
      properties: bag({ flags: { Fly: true } }),
    })

    expect(parsed.helmetDetails?.[0]).toMatchObject({
      baseType: 'hat',
      ego: 'intelligence',
      properties: bag({ numeric: { Int: 3 } }),
    })
  })

  it('splits intrinsic and artifact properties for randart dragon scales', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-midori369-20260406-191652.txt'))

    expect(parsed.bodyArmour).toBe('fire dragon scales of Undesirable Species')
    expect(parsed.bodyArmourDetails).toMatchObject({
      rawName: 'fire dragon scales of Undesirable Species',
      objectClass: 'armour',
      baseType: 'fire dragon scales',
      enchant: 8,
      artifactKind: 'randart',
      ego: null,
      intrinsicProperties: bag({ numeric: { rF: 2, rC: -1 } }),
      artifactProperties: bag({ numeric: { rN: 1, Will: 1, Int: 6, Slay: -5 } }),
      properties: bag({ numeric: { rF: 2, rC: -1, rN: 1, Will: 1, Int: 6, Slay: -5 } }),
    })
  })

  it('keeps combined properties alongside split sources for intrinsic randart armour bonuses', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-FF96-20260407-041444.txt'))

    expect(parsed.bodyArmourDetails).toMatchObject({
      rawName: 'pearl dragon scales of Benevolence',
      baseType: 'pearl dragon scales',
      intrinsicProperties: bag({ numeric: { rN: 1 } }),
      artifactProperties: bag({ numeric: { rN: 1 } }),
      properties: bag({ numeric: { rN: 2 } }),
    })
  })

  it('keeps randart jewellery generic while preserving detailed properties', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-midori369-20260406-191652.txt'))

    expect(parsed.amulet).toBe('amulet of magic regeneration')
    expect(parsed.rings).toEqual(['ring of wizardry', 'ring of the Byakko'])

    expect(parsed.amuletDetails).toMatchObject({
      objectClass: 'jewellery',
      baseType: 'amulet',
      artifactKind: 'normal',
      subtypeEffect: 'magic regeneration',
      intrinsicProperties: bag({ numeric: { RegenMP: 1 } }),
      properties: bag({ numeric: { RegenMP: 1 } }),
    })

    expect(parsed.ringDetails?.[0]).toMatchObject({
      baseType: 'ring',
      subtypeEffect: 'wizardry',
      properties: bag({ flags: { Wiz: true } }),
    })

    expect(parsed.ringDetails?.[1]).toMatchObject({
      rawName: 'ring of the Byakko',
      artifactKind: 'randart',
      properties: bag({
        numeric: { Will: -1 },
        flags: { rElec: true, rPois: true, rCorr: true, SInv: true },
      }),
      artifactProperties: bag({
        numeric: { Will: -1 },
        flags: { rElec: true, rPois: true, rCorr: true, SInv: true },
      }),
    })
  })

  it('keeps known unrand gloves by name while storing structured properties', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-Tyrellia-20260406-181223.txt'))

    expect(parsed.gloves).toEqual(["Mad Mage's Maulers"])
    expect(parsed.glovesDetails?.[0]).toMatchObject({
      rawName: "Mad Mage's Maulers",
      displayName: "Mad Mage's Maulers",
      objectClass: 'armour',
      equipState: 'worn',
      isCursed: false,
      baseType: 'gloves',
      enchant: 3,
      artifactKind: 'unrand',
      properties: bag({ specials: ['Infuse+∞', 'VampMP', '-Cast'] }),
      artifactProperties: bag({ specials: ['Infuse+∞', 'VampMP', '-Cast'] }),
    })
  })

  it('continues parsing equipped items when descriptions are interleaved in inventory', () => {
    const parsed = extractEquipment(loadFixture('focused', 'equipped-accessories-with-descriptions.txt'))

    expect(parsed.bodyArmour).toBe('pearl dragon scales "Petz"')
    expect(parsed.amulet).toBe('amulet of Vitality')
    expect(parsed.rings).toEqual(['ring of the Empty Page', 'ring "Veveor"'])
    expect(parsed.cloaks).toEqual(['cloak "Rafeal"'])

    expect(parsed.bodyArmourDetails?.intrinsicProperties).toEqual(bag({ numeric: { rN: 1 } }))
    expect(parsed.bodyArmourDetails?.artifactProperties).toEqual(
      bag({ numeric: { Regen: 1, Str: 2 }, flags: { SInv: true }, specials: ['^Drain'] }),
    )
    expect(parsed.amuletDetails?.artifactProperties).toEqual(
      bag({ numeric: { Regen: 2, RegenMP: 2 } }),
    )
  })

  it('separates functional inscriptions from equipped item properties', () => {
    const parsed = extractEquipment(loadFixture('focused', 'functional-inscriptions-on-equipped-items.txt'))

    expect(parsed.rings).toEqual(['ring of willpower', 'ring of poison resistance'])

    expect(parsed.ringDetails?.[0]).toMatchObject({
      rawName: 'ring of willpower',
      propertiesText: '!R test',
      functionalInscriptions: ['!R'],
      properties: bag({ numeric: { Will: 1 }, specials: ['test'] }),
    })

    expect(parsed.ringDetails?.[1]).toMatchObject({
      rawName: 'ring of poison resistance',
      propertiesText: '!w =f !D My Stone',
      functionalInscriptions: ['!w', '=f', '!D'],
      properties: bag({ flags: { rPois: true }, specials: ['My', 'Stone'] }),
    })
  })

  it('keeps multiple haunted aux items for poltergeists instead of collapsing them', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-Skeff-20260406-201301.txt'))

    expect(parsed.bodyArmour).toBe('none')
    expect(parsed.helmets).toEqual(['hat of Pondering'])
    expect(parsed.gloves).toEqual(['pair of gloves of dexterity'])
    expect(parsed.footwear).toEqual([
      'pair of boots',
      'pair of boots of flying',
      'pair of boots',
    ])
    expect(parsed.cloaks).toEqual(['cloak'])

    expect(parsed.footwearDetails?.map((item) => item.equipState)).toEqual([
      'haunted',
      'haunted',
      'haunted',
    ])
  })

  it('classifies cursed haunted gauntlets as gloves instead of body armour', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-jkt-20260406-212621.txt'))

    expect(parsed.bodyArmour).toBe('none')
    expect(parsed.gloves).toEqual(['pair of gauntlets of War'])
    expect(parsed.glovesDetails?.[0]).toMatchObject({
      rawName: 'pair of gauntlets of War',
      displayName: 'gauntlets of War',
      equipState: 'haunted',
      isCursed: true,
      baseType: 'gloves',
      artifactKind: 'unrand',
    })
    expect(parsed.helmets).toEqual([
      'hat of the Chained Sun',
      'hat of Ashenzari\'s Gnosis',
    ])
    expect(parsed.cloaks).toEqual([
      'cloak of willpower',
      'scarf "Chained Fetters"',
      'cloak of Ashenzari\'s Failure',
    ])
  })

  it('recognizes known unrand shields even when the name does not include shield subtype text first', () => {
    const parsed = extractEquipment(`
Inventory:

Armour
 C - the +2 shield of Resistance (worn) {rF++ rC++ Will++}
   (You found it on level 3 of the Elven Halls)
`)

    expect(parsed.shield).toBe('shield of Resistance')
    expect(parsed.shieldDetails).toMatchObject({
      rawName: 'shield of Resistance',
      objectClass: 'armour',
      baseType: 'kite shield',
      artifactKind: 'unrand',
      properties: bag({ numeric: { rF: 2, rC: 2, Will: 2 } }),
      artifactProperties: bag({ numeric: { rF: 2, rC: 2, Will: 2 } }),
    })
  })

  it('classifies known orb-slot unrands without orb in the name as orb equipment', () => {
    const parsed = extractEquipment(`
Health: 197/238    AC: 17    Str:  8    XL:     27
Magic:  39/63      EV: 15    Int: 38    God:    Vehumet [******]
Gold:   5060       SH:  0    Dex:  9    Spells: 30/79 levels left

rFire   + + +  (20%)    r - conjuration staff of Strategic Superiority {Int+4 Conj Necro Forge}
rCold   + + +  (20%)    q - sphere of Battle
rNeg    + + .  (20%)    C - +2 hat {SInv}
rPois   +      (33%)    f - scarf {rC+ rF+}
rElec   +      (33%)    Z - +0 pair of gloves of Fosebrol {MP+10 Int+2}
rCorr   +      (50%)    c - +0 pair of boots of Forking Paths {rPois rCorr Int+4 Dex-3}
SInv    +               e - amulet of magic regeneration
Will    +++..           Q - ring of Vufum {rPois rF++ rC+ rN++ Str-2}
Stlth   +               p - ring "Heshrocog" {rC+ Will+ rCorr Str-2}

Inventory:

Armour
 c - the +0 pair of boots of Forking Paths (worn) {rPois rCorr Int+4 Dex-3}
 f - a scarf of resistance (worn)
 q - the sphere of Battle (worn)
 C - a +2 hat of see invisible (worn)
 Z - the +0 pair of gloves of Fosebrol (worn) {MP+10 Int+2}
Jewellery
 e - an amulet of magic regeneration (worn)
 p - the ring "Heshrocog" (worn) {rC+ Will+ rCorr Str-2}
 Q - the ring of Vufum (worn) {rPois rF++ rC+ rN++ Str-2}
`)

    expect(parsed.bodyArmour).toBe('none')
    expect(parsed.orb).toBe('sphere of Battle')
    expect(parsed.orbDetails).toMatchObject({
      rawName: 'sphere of Battle',
      objectClass: 'armour',
      equipState: 'worn',
      artifactKind: 'unrand',
      baseType: 'orb',
    })
  })

  it('preserves melded equipment and the equipped talisman slot', () => {
    const parsed = extractEquipment(loadFixture('focused', 'melded-equipment-and-talisman.txt'))

    expect(parsed.bodyArmour).toBe('acid dragon scales "Discomfort of Ashenzari"')
    expect(parsed.helmets).toEqual(['helmet of the Shattered Mistrust'])
    expect(parsed.talisman).toBe('hive talisman "Wekitiug"')

    expect(parsed.bodyArmourDetails).toMatchObject({
      equipState: 'melded',
      isCursed: true,
      baseType: 'acid dragon scales',
      artifactKind: 'randart',
      intrinsicProperties: bag({ flags: { rCorr: true } }),
      artifactProperties: bag({ specials: ['Elem', 'Sorc'] }),
    })

    expect(parsed.helmetDetails?.[0]).toMatchObject({
      equipState: 'melded',
      isCursed: true,
      baseType: 'helmet',
      artifactKind: 'randart',
      artifactProperties: bag({ numeric: { Int: 3 }, specials: ['Comp', 'Sorc'] }),
    })

    expect(parsed.talismanDetails).toMatchObject({
      rawName: 'hive talisman "Wekitiug"',
      objectClass: 'talisman',
      equipState: 'worn',
      baseType: 'hive talisman',
      artifactKind: 'randart',
      properties: bag({ numeric: { rC: -1, Will: 3 }, flags: { rElec: true } }),
    })
  })

  it('prefers the current melded talisman state from the morgue summary over inventory worn markers', () => {
    const parsed = extractEquipment(
      loadFixture('focused', 'melded-talisman-summary-overrides-inventory.txt'),
    )

    expect(parsed.talisman).toBe('rimehorn talisman')
    expect(parsed.talismanDetails).toMatchObject({
      rawName: 'rimehorn talisman',
      objectClass: 'talisman',
      equipState: 'melded',
      baseType: 'rimehorn talisman',
      artifactKind: 'normal',
    })
    expect(parsed.amuletDetails?.equipState).toBe('worn')
    expect(parsed.ringDetails?.map((item) => item.equipState)).toEqual(['worn', 'worn'])
  })
})

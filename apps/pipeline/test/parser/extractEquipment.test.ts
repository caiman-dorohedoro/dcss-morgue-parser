import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractEquipment } from 'dcss-morgue-parser'
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
    booleanProps: input.booleanProps ?? {},
    opaqueTokens: input.opaqueTokens ?? [],
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
      properties: bag({ booleanProps: { Fly: true } }),
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

  it('keeps randart jewellery names in displayName while preserving detailed properties', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-midori369-20260406-191652.txt'))

    expect(parsed.amulets).toEqual(['amulet of magic regeneration'])
    expect(parsed.rings).toEqual(['ring of wizardry', 'ring of the Byakko'])

    expect(parsed.amuletDetails?.[0]).toMatchObject({
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
      properties: bag({ booleanProps: { Wiz: true } }),
    })

    expect(parsed.ringDetails?.[1]).toMatchObject({
      rawName: 'ring of the Byakko',
      displayName: 'ring of the Byakko',
      artifactKind: 'randart',
      properties: bag({
        numeric: { Will: -1 },
        booleanProps: { rElec: true, rPois: true, rCorr: true, SInv: true },
      }),
      artifactProperties: bag({
        numeric: { Will: -1 },
        booleanProps: { rElec: true, rPois: true, rCorr: true, SInv: true },
      }),
    })
  })

  it('preserves both worn amulets when body armour grants an extra amulet slot', () => {
    const parsed = extractEquipment(loadFixture('focused', 'regalia-two-amulets.txt'))

    expect(parsed.bodyArmour).toBe("justicar's regalia")
    expect(parsed.bodyArmourDetails?.baseType).toBe('scale mail')
    expect(parsed.bodyArmourDetails?.artifactKind).toBe('unrand')
    expect(parsed.amulets).toEqual(['amulet of regeneration', 'amulet of dissipation'])
    expect(parsed.amuletDetails?.map((item) => item.rawName)).toEqual([
      'amulet of regeneration',
      'amulet of dissipation',
    ])
    expect(parsed.rings).toEqual(['ring "Sehodam"', 'ring "Wozxet"'])
  })

  it('recognizes current Crawl armour unrands whose names no longer expose their slot', () => {
    const parsed = extractEquipment(loadFixture('focused', 'current-unrands-missing-from-parser.txt'))

    expect(parsed.bodyArmour).toBe('robe of Misfortune')
    expect(parsed.bodyArmourDetails).toMatchObject({
      rawName: 'robe of Misfortune',
      baseType: 'robe',
      artifactKind: 'unrand',
    })

    expect(parsed.shield).toBe('shield of the Gong')
    expect(parsed.shieldDetails).toMatchObject({
      rawName: 'shield of the Gong',
      baseType: 'kite shield',
      artifactKind: 'unrand',
    })

    expect(parsed.helmets).toEqual(['crown of vainglory'])
    expect(parsed.helmetDetails?.[0]).toMatchObject({
      rawName: 'crown of vainglory',
      baseType: 'hat',
      artifactKind: 'unrand',
    })

    expect(parsed.cloaks).toEqual(['fungal fisticloak'])
    expect(parsed.cloakDetails?.[0]).toMatchObject({
      rawName: 'fungal fisticloak',
      baseType: 'cloak',
      artifactKind: 'unrand',
    })

    expect(parsed.footwear).toEqual(['lightning scales'])
    expect(parsed.footwearDetails?.[0]).toMatchObject({
      rawName: 'lightning scales',
      baseType: 'barding',
      artifactKind: 'unrand',
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
      properties: bag({
        booleanProps: { '-Cast': true },
        opaqueTokens: ['Infuse+∞', 'VampMP'],
      }),
      artifactProperties: bag({
        booleanProps: { '-Cast': true },
        opaqueTokens: ['Infuse+∞', 'VampMP'],
      }),
    })
  })

  it('fills base types for equipped unrands whose names hide the underlying armour class', () => {
    const patent = extractEquipment(loadFixture('full', 'morgue-Hungry0364-20260402-095531.txt'))
    const dragonKing = extractEquipment(loadFixture('full', 'morgue-joeboomin-20260404-223512.txt'))

    expect(patent.bodyArmourDetails).toMatchObject({
      rawName: "Maxwell's patent armour",
      baseType: 'plate armour',
      artifactKind: 'unrand',
    })

    expect(dragonKing.bodyArmourDetails).toMatchObject({
      rawName: 'scales of the Dragon King',
      baseType: 'golden dragon scales',
      artifactKind: 'unrand',
      equipState: 'melded',
    })
  })

  it('uses Crawl source subtype as the base type for faerie dragon scales', () => {
    const parsed = extractEquipment([
      'Dungeon Crawl Stone Soup version 0.34.1-3-ga2c7840dd7 (webtiles) character file.',
      '',
      'Health: 249/249    AC: 30    Str: 15    XL:     27',
      'rFire   + . .  (50%)    Q - +7 faerie dragon scales {rElec rF+ rCorr Str+2 Stlth- Hexes}',
      '',
      'Inventory:',
      '',
      'Armour',
      ' Q - the +7 faerie dragon scales (worn) {rElec rF+ rCorr Str+2 Stlth- Hexes}',
      '',
      'Skills:',
    ].join('\n'))

    expect(parsed.bodyArmour).toBe('faerie dragon scales')
    expect(parsed.bodyArmourDetails).toMatchObject({
      rawName: 'faerie dragon scales',
      displayName: 'faerie dragon scales',
      baseType: 'acid dragon scales',
      artifactKind: 'unrand',
      enchant: 7,
      intrinsicProperties: bag({ booleanProps: { rCorr: true } }),
      artifactProperties: bag({
        numeric: { rF: 1, Str: 2, Stlth: -1 },
        booleanProps: { rElec: true },
        opaqueTokens: ['Hexes'],
      }),
    })
  })

  it('uses Crawl source subtypes for unrand armour whose visible names look like base types', () => {
    const parsed = extractEquipment([
      'Dungeon Crawl Stone Soup version 0.34.1-3-ga2c7840dd7 (webtiles) character file.',
      '',
      'Health: 100/100    AC: 30    Str: 15    XL:     10',
      'rFire   + + .  (33%)    A - +3 salamander hide armour {Flames, rFlCloud rF++ rC--}',
      'SInv    +               M - +2 mask of the Dragon {Dragonpray SInv}',
      '',
      'Inventory:',
      '',
      'Armour',
      ' A - the +3 salamander hide armour (worn) {Flames, rFlCloud rF++ rC--}',
      ' C - the +3 crown of Dyrovepreva {rElec Int+2 SInv}',
      ' H - the +2 hood of the Assassin {Detect Stab+ Stlth++}',
      ' M - the +2 mask of the Dragon (worn) {Dragonpray SInv}',
      '',
      'Skills:',
    ].join('\n'))

    expect(parsed.bodyArmourDetails).toMatchObject({
      rawName: 'salamander hide armour',
      displayName: 'salamander hide armour',
      baseType: 'leather armour',
      artifactKind: 'unrand',
    })
    expect(parsed.helmetDetails?.[0]).toMatchObject({
      rawName: 'mask of the Dragon',
      displayName: 'Mask of the Dragon',
      baseType: 'hat',
      artifactKind: 'unrand',
    })

    const unequippedUnrands = extractEquipment([
      'Dungeon Crawl Stone Soup version 0.34.1-3-ga2c7840dd7 (webtiles) character file.',
      '',
      'Health: 100/100    AC: 30    Str: 15    XL:     10',
      'SInv    +               C - +3 crown of Dyrovepreva {rElec Int+2 SInv}',
      '',
      'Inventory:',
      '',
      'Armour',
      ' C - the +3 crown of Dyrovepreva (worn) {rElec Int+2 SInv}',
      ' H - the +2 hood of the Assassin {Detect Stab+ Stlth++}',
      '',
      'Skills:',
    ].join('\n'))

    expect(unequippedUnrands.helmetDetails?.[0]).toMatchObject({
      rawName: 'crown of Dyrovepreva',
      displayName: 'crown of Dyrovepreva',
      baseType: 'hat',
      artifactKind: 'unrand',
    })

    const hood = extractEquipment([
      'Dungeon Crawl Stone Soup version 0.34.1-3-ga2c7840dd7 (webtiles) character file.',
      '',
      'Health: 100/100    AC: 30    Str: 15    XL:     10',
      'Stlth   ++++           H - +2 hood of the Assassin {Detect Stab+ Stlth++}',
      '',
      'Inventory:',
      '',
      'Armour',
      ' H - the +2 hood of the Assassin (worn) {Detect Stab+ Stlth++}',
      '',
      'Skills:',
    ].join('\n'))

    expect(hood.helmetDetails?.[0]).toMatchObject({
      rawName: 'hood of the Assassin',
      displayName: 'hood of the Assassin',
      baseType: 'hat',
      artifactKind: 'unrand',
    })
  })

  it('continues parsing equipped items when descriptions are interleaved in inventory', () => {
    const parsed = extractEquipment(loadFixture('focused', 'equipped-accessories-with-descriptions.txt'))

    expect(parsed.bodyArmour).toBe('pearl dragon scales "Petz"')
    expect(parsed.amulets).toEqual(['amulet of Vitality'])
    expect(parsed.rings).toEqual(['ring of the Empty Page', 'ring "Veveor"'])
    expect(parsed.cloaks).toEqual(['cloak "Rafeal"'])

    expect(parsed.bodyArmourDetails?.intrinsicProperties).toEqual(bag({ numeric: { rN: 1 } }))
    expect(parsed.bodyArmourDetails?.artifactProperties).toEqual(
      bag({
        numeric: { Regen: 1, Str: 2 },
        booleanProps: { SInv: true, '^Drain': true },
      }),
    )
    expect(parsed.amuletDetails?.[0]?.artifactProperties).toEqual(
      bag({ numeric: { Regen: 2, RegenMP: 2 } }),
    )
  })

  it('promotes common artefact tags like Bane into booleanProps', () => {
    const parsed = extractEquipment(loadFixture('full', 'morgue-FF96-20260407-041444.txt'))

    expect(parsed.amulets).toEqual(['amulet of Fompol'])
    expect(parsed.amuletDetails?.[0]).toMatchObject({
      rawName: 'amulet of Fompol',
      displayName: 'amulet of Fompol',
      artifactKind: 'randart',
      properties: bag({
        numeric: { rF: 1 },
        booleanProps: {
          Bane: true,
          Rampage: true,
          Acrobat: true,
          Fly: true,
          rPois: true,
        },
      }),
      artifactProperties: bag({
        numeric: { rF: 1 },
        booleanProps: {
          Bane: true,
          Rampage: true,
          Acrobat: true,
          Fly: true,
          rPois: true,
        },
      }),
    })
  })

  it('separates functional inscriptions from equipped item properties', () => {
    const parsed = extractEquipment(loadFixture('focused', 'functional-inscriptions-on-equipped-items.txt'))

    expect(parsed.rings).toEqual(['ring of willpower', 'ring of poison resistance'])

    expect(parsed.ringDetails?.[0]).toMatchObject({
      rawName: 'ring of willpower',
      propertiesText: '!R test',
      functionalInscriptions: ['!R'],
      properties: bag({ numeric: { Will: 1 }, opaqueTokens: ['test'] }),
    })

    expect(parsed.ringDetails?.[1]).toMatchObject({
      rawName: 'ring of poison resistance',
      propertiesText: '!w =f !D My Stone',
      functionalInscriptions: ['!w', '=f', '!D'],
      properties: bag({ booleanProps: { rPois: true }, opaqueTokens: ['My', 'Stone'] }),
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

  it('does not treat Hat+ on the skull of Zonguldrok as a helmet item', () => {
    const parsed = extractEquipment(`
Health: 197/238    AC: 17    Str:  8    XL:     27
Magic:  39/63      EV: 15    Int: 38    God:    Vehumet [******]
Gold:   5060       SH:  0    Dex:  9    Spells: 30/79 levels left

rFire   + + +  (20%)    d - skull of Zonguldrok {Reaping Hat+ rN+ Int+4}
rCold   + + +  (20%)    C - +2 hat {SInv}

Inventory:

Armour
 d - the skull of Zonguldrok (worn) {Reaping Hat+ rN+ Int+4}
 C - a +2 hat of see invisible (worn)
`)

    expect(parsed.orb).toBe('skull of Zonguldrok')
    expect(parsed.orbDetails).toMatchObject({
      rawName: 'skull of Zonguldrok',
      displayName: 'skull of Zonguldrok',
      objectClass: 'armour',
      artifactKind: 'unrand',
      baseType: 'orb',
    })
    expect(parsed.helmets).toEqual(['hat of see invisible'])
    expect(parsed.helmetDetails).toHaveLength(1)
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
      intrinsicProperties: bag({ booleanProps: { rCorr: true } }),
      artifactProperties: bag(),
      ashenzariCurses: ['Elem', 'Sorc'],
    })

    expect(parsed.helmetDetails?.[0]).toMatchObject({
      equipState: 'melded',
      isCursed: true,
      baseType: 'helmet',
      artifactKind: 'randart',
      artifactProperties: bag({ numeric: { Int: 3 } }),
      ashenzariCurses: ['Comp', 'Sorc'],
    })

    expect(parsed.talismanDetails).toMatchObject({
      rawName: 'hive talisman "Wekitiug"',
      objectClass: 'talisman',
      equipState: 'worn',
      baseType: 'hive talisman',
      artifactKind: 'randart',
      properties: bag({ numeric: { rC: -1, Will: 3 }, booleanProps: { rElec: true } }),
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
    expect(parsed.amuletDetails?.[0]?.equipState).toBe('worn')
    expect(parsed.ringDetails?.map((item) => item.equipState)).toEqual(['worn', 'worn'])
  })

  it('parses installed Coglin gizmos as a distinct slot with structured properties', () => {
    const parsed = extractEquipment(loadFixture('focused', 'coglin-gizmo-installed-jingleheimer.txt'))

    expect(parsed.amulets).toEqual([])
    expect(parsed.rings).toEqual([])
    expect(parsed.gizmo).toBe('cataphasic hydrosorter')
    expect(parsed.gizmoDetails).toMatchObject({
      rawName: 'cataphasic hydrosorter',
      displayName: 'cataphasic hydrosorter',
      objectClass: 'gizmo',
      equipState: 'installed',
      isCursed: false,
      baseType: 'gizmo',
      artifactKind: 'randart',
      properties: bag({
        numeric: { MP: 4 },
        booleanProps: { rElec: true, Wiz: true, Clar: true, RMsl: true },
      }),
      artifactProperties: bag({
        numeric: { MP: 4 },
        booleanProps: { rElec: true, Wiz: true, Clar: true, RMsl: true },
      }),
    })
  })

  it('emits gizmo-only effect tags separately for installed gizmos', () => {
    const parsed = extractEquipment(loadFixture('focused', 'coglin-gizmo-revguard-nono3.txt'))

    expect(parsed.gizmo).toBe('dicompression equaliser')
    expect(parsed.gizmoDetails).toMatchObject({
      rawName: 'dicompression equaliser',
      objectClass: 'gizmo',
      equipState: 'installed',
      gizmoEffects: ['RevGuard'],
      properties: bag({
        numeric: { rF: 1, rC: 1 },
      }),
      artifactProperties: bag({
        numeric: { rF: 1, rC: 1 },
      }),
    })
    expect(parsed.gizmoDetails?.namedEffects).toBeUndefined()
  })

  it('keeps no-gizmo Coglins empty without inventing jewellery or gizmo equipment', () => {
    const parsed = extractEquipment(loadFixture('focused', 'coglin-no-gizmo-disgorge.txt'))

    expect(parsed.amulets).toEqual([])
    expect(parsed.rings).toEqual([])
    expect(parsed.gizmo).toBe('none')
    expect(parsed.gizmoDetails).toBeUndefined()
  })

  it('emits named effects for non-gizmo items without misclassifying them as gizmo effects', () => {
    const parsed = extractEquipment(loadFixture('focused', 'named-effects-on-non-gizmo-items.txt'))

    expect(parsed.helmets).toEqual(['mask of the Dragon'])
    expect(parsed.gloves).toEqual(['pair of gloves of the gadgeteer'])

    expect(parsed.helmetDetails?.[0]).toMatchObject({
      rawName: 'mask of the Dragon',
      objectClass: 'armour',
      equipState: 'worn',
      baseType: 'hat',
      namedEffects: ['Dragonpray'],
      properties: bag({ booleanProps: { SInv: true } }),
      artifactProperties: bag({ booleanProps: { SInv: true } }),
    })
    expect(parsed.helmetDetails?.[0]?.gizmoEffects).toBeUndefined()

    expect(parsed.glovesDetails?.[0]).toMatchObject({
      rawName: 'pair of gloves of the gadgeteer',
      objectClass: 'armour',
      equipState: 'worn',
      namedEffects: ['Gadgeteer', 'Wandboost'],
      ashenzariCurses: ['Fort', 'Cun'],
      properties: bag({ opaqueTokens: ['^Fragile'] }),
      artifactProperties: bag({ opaqueTokens: ['^Fragile'] }),
    })
    expect(parsed.glovesDetails?.[0]?.gizmoEffects).toBeUndefined()
  })
})

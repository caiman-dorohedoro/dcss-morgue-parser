import type { ParseMorgueTextOptions, ParseMorgueTextResult } from './types'
import { extractBaseStats } from './extractBaseStats'
import { extractEquipment } from './extractEquipment'
import { extractForm } from './extractForm'
import { extractGodHistory } from './extractGodHistory'
import { extractMutations } from './extractMutations'
import { extractSkills } from './extractSkills'
import { extractSpells } from './extractSpells'
import { ParseFailure, validateStrict } from './validateStrict'

export function parseMorgueText(text: string, options: ParseMorgueTextOptions = {}): ParseMorgueTextResult {
  try {
    const equipment = extractEquipment(text)
    const record = validateStrict({
      ...extractBaseStats(text, { speciesNames: options.speciesNames }),
      ...equipment,
      ...extractForm(text, {
        equippedTalismanBaseType: equipment.talismanDetails?.baseType ?? null,
      }),
      ...extractSkills(text),
      ...extractMutations(text),
      spells: extractSpells(text, {
        canonicalSpellNames: options.canonicalSpellNames,
      }),
      godHistory: extractGodHistory(text),
    })

    const orderedRecord = {
      playerName: record.playerName,
      version: record.version,
      species: record.species,
      speciesVariant: record.speciesVariant,
      background: record.background,
      god: record.god,
      godPietyDisplay: record.godPietyDisplay,
      godPietyRank: record.godPietyRank,
      godOstracismPips: record.godOstracismPips,
      godStatus: record.godStatus,
      godUnderPenance: record.godUnderPenance,
      xl: record.xl,
      ac: record.ac,
      ev: record.ev,
      sh: record.sh,
      strength: record.strength,
      intelligence: record.intelligence,
      dexterity: record.dexterity,
      bodyArmour: record.bodyArmour,
      shield: record.shield,
      helmets: record.helmets,
      gloves: record.gloves,
      footwear: record.footwear,
      cloaks: record.cloaks,
      orb: record.orb,
      amulets: record.amulets,
      rings: record.rings,
      talisman: record.talisman,
      form: record.form,
      ...(record.bodyArmourDetails ? { bodyArmourDetails: record.bodyArmourDetails } : {}),
      ...(record.shieldDetails ? { shieldDetails: record.shieldDetails } : {}),
      ...(record.helmetDetails ? { helmetDetails: record.helmetDetails } : {}),
      ...(record.glovesDetails ? { glovesDetails: record.glovesDetails } : {}),
      ...(record.footwearDetails ? { footwearDetails: record.footwearDetails } : {}),
      ...(record.cloakDetails ? { cloakDetails: record.cloakDetails } : {}),
      ...(record.orbDetails ? { orbDetails: record.orbDetails } : {}),
      ...(record.amuletDetails ? { amuletDetails: record.amuletDetails } : {}),
      ...(record.ringDetails ? { ringDetails: record.ringDetails } : {}),
      ...(record.gizmo && record.gizmo !== 'none' ? { gizmo: record.gizmo } : {}),
      ...(record.gizmoDetails ? { gizmoDetails: record.gizmoDetails } : {}),
      ...(record.talismanDetails ? { talismanDetails: record.talismanDetails } : {}),
      skills: record.skills,
      effectiveSkills: record.effectiveSkills,
      spells: record.spells,
      mutations: record.mutations,
      godHistory: record.godHistory,
    }

    return {
      ok: true,
      record: orderedRecord,
    }
  } catch (error) {
    if (error instanceof ParseFailure) {
      return {
        ok: false,
        failure: {
          reason: error.reason,
          detail: error.detail,
        },
      }
    }

    return {
      ok: false,
      failure: {
        reason: 'unsupported_morgue_layout',
        detail: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

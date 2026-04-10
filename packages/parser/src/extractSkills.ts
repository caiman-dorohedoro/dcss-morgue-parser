import type { SkillLevelsSnapshot, SkillsSnapshot } from './types'
import { createEmptySkillLevels, parseSkillEntries } from './skillMetadata'

export function extractSkills(text: string): SkillsSnapshot {
  const parsed = parseSkillEntries(text)
  const skills: SkillLevelsSnapshot = createEmptySkillLevels()
  const effectiveSkills: SkillLevelsSnapshot = createEmptySkillLevels()

  for (const entry of parsed) {
    // Ignore unknown skill labels so parser stays forward-compatible with
    // future Crawl skill table changes.
    if (!entry.key) {
      continue
    }

    skills[entry.key] = entry.level
    effectiveSkills[entry.key] = entry.effectiveLevel
  }

  return { skills, effectiveSkills }
}

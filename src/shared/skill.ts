import { skillCategories, type SkillCategory } from './types.js';

/** Max skill tier gap allowed in one group (0 = same tier only, 1 = adjacent tiers). */
export const MAX_SKILL_TIER_SPREAD = 1;

export function skillTierIndex(skill: SkillCategory): number {
  return skillCategories.indexOf(skill);
}

export function skillTierSpread(skills: SkillCategory[]): number {
  if (skills.length === 0) return 0;
  const indices = skills.map(skillTierIndex);
  return Math.max(...indices) - Math.min(...indices);
}

export function isValidSkillGroup(skills: SkillCategory[]): boolean {
  return skillTierSpread(skills) <= MAX_SKILL_TIER_SPREAD;
}

export function hasMixedSkillTiers(skills: SkillCategory[]): boolean {
  return skillTierSpread(skills) > 0;
}

export function getSkillGapDescription(skills: SkillCategory[]): string | null {
  if (skills.length === 0 || isValidSkillGroup(skills)) return null;
  const tiers = [...new Set(skills)]
    .sort((a, b) => skillTierIndex(a) - skillTierIndex(b))
    .join(', ');
  return `This group mixes ${tiers} — more than one skill tier apart.`;
}

export function assertSkillGroupAllowed(
  skills: SkillCategory[],
  allowSkillMismatch: boolean,
): void {
  if (isValidSkillGroup(skills) || allowSkillMismatch) return;
  throw new Error(
    getSkillGapDescription(skills) ?? 'Players are too far apart in skill tier',
  );
}

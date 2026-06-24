import {
  getSkillGapDescription,
  hasMixedSkillTiers,
  isValidSkillGroup,
} from '../../shared/skill';
import type { SkillCategory } from '../../shared/types';
import { showConfirm } from './dialog';

/** Prompt when skills span more than one tier apart; returns whether to proceed with override. */
export async function confirmSkillMismatchIfNeeded(
  skills: SkillCategory[],
): Promise<{ proceed: boolean; allowSkillMismatch: boolean }> {
  if (isValidSkillGroup(skills)) {
    return { proceed: true, allowSkillMismatch: false };
  }

  const description =
    getSkillGapDescription(skills) ?? 'Players are too far apart in skill tier.';
  const ok = await showConfirm(`${description}\n\nAllow them to play together anyway?`, {
    title: 'Skill levels are far apart',
    confirmLabel: 'Allow anyway',
  });
  return { proceed: ok, allowSkillMismatch: ok };
}

/** Adjacent-tier mix (valid but not same tier) — optional staff confirm before grouping. */
export async function confirmAdjacentSkillMixIfNeeded(
  skills: SkillCategory[],
): Promise<boolean> {
  if (!hasMixedSkillTiers(skills) || !isValidSkillGroup(skills)) {
    return true;
  }
  const tiers = [...new Set(skills)].join(', ');
  return showConfirm(
    `This group mixes ${tiers}. Continue to group these players together?`,
    { title: 'Skill levels are apart', confirmLabel: 'Group together' },
  );
}

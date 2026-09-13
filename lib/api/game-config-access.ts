type GameConfigOwner = { user_id: string | null };
type OwnerLookup = (id: string) => Promise<GameConfigOwner | null>;

export type ExperienceVisibility = 'draft' | 'published' | null;

export type GameExperienceAccessRecord = {
  user_id: string | null;
  visibility: ExperienceVisibility;
};

export function canReadGameExperience(
  requesterUserId: string | null,
  record: GameExperienceAccessRecord,
): boolean {
  // NULL visibility is intentionally public for backward compatibility with
  // records created before the P1a visibility column existed.
  return record.visibility === null
    || record.visibility === 'published'
    || (record.user_id !== null && record.user_id === requesterUserId);
}

export function canMutateGameExperience(
  requesterUserId: string | null,
  record: Pick<GameExperienceAccessRecord, 'user_id'>,
): boolean {
  return requesterUserId !== null && record.user_id !== null && record.user_id === requesterUserId;
}

export function publicationUpdate(visibility: Exclude<ExperienceVisibility, null>) {
  return {
    visibility,
    is_published: visibility === 'published',
  } as const;
}

export async function verifyGameConfigOwner(
  userId: string,
  gameId: string,
  lookup: OwnerLookup,
): Promise<boolean> {
  const record = await lookup(gameId);
  return !!record && canMutateGameExperience(userId, record);
}

export async function userOwnsGameConfig(
  supabase: SupabaseClient,
  userId: string,
  gameId: string,
): Promise<boolean> {
  return verifyGameConfigOwner(userId, gameId, async (id) => {
    const { data, error } = await supabase
      .from('game_configs')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    return error ? null : data;
  });
}
import type { SupabaseClient } from '@supabase/supabase-js';

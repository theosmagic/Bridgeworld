/**
 * Genesis Legion holder check — ported from TreasureProject/treasure-functions
 * Uses self-hosted subgraph (SUBGRAPH_API_URL) instead of Goldsky.
 */

const GENESIS_LEGION_QUERY = (wallets: string[]) => `{
  userTokens(
    first: 1000
    where: {
      user_in: [${wallets.map((w) => `"${w.toLowerCase()}"`).join(', ')}]
      token_: { category: Legion, generation: 0 }
    }
  ) { id }
  crafts(
    first: 1000
    where: {
      user_in: [${wallets.map((w) => `"${w.toLowerCase()}"`).join(', ')}]
      token_: { category: Legion, generation: 0 }
      status_not: Finished
    }
  ) { id }
  advancedQuests(
    first: 1000
    where: {
      user_in: [${wallets.map((w) => `"${w.toLowerCase()}"`).join(', ')}]
      token_: { category: Legion, generation: 0 }
      status_not: Finished
    }
  ) { id }
  stakedTokens(
    first: 1000
    where: {
      user_in: [${wallets.map((w) => `"${w.toLowerCase()}"`).join(', ')}]
      token_: { category: Legion, generation: 0 }
    }
  ) { id }
}`;

const CRYPTS_SQUAD_QUERY = (wallets: string[]) => `{
  cryptsSquads(
    first: 1000
    where: {
      user_in: [${wallets.map((w) => `"${w.toLowerCase()}"`).join(', ')}]
      characters_: { collection: "0xfe8c1ac365ba6780aec5a985d989b327c27670a1" }
    }
  ) {
    characters { tokenId }
  }
}`;

const TOKENS_BY_ID_QUERY = (tokenIds: string[]) => `{
  tokens(
    where: {
      category: Legion
      generation: 0
      tokenId_in: [${tokenIds.join(', ')}]
    }
  ) { id }
}`;

interface SubgraphData {
  userTokens?: { id: string }[];
  crafts?: { id: string }[];
  advancedQuests?: { id: string }[];
  stakedTokens?: { id: string }[];
  cryptsSquads?: { characters?: { tokenId: string }[] }[];
  tokens?: { id: string }[];
}

async function querySubgraph(url: string, query: string): Promise<SubgraphData> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`subgraph ${res.status}`);
  const json = (await res.json()) as { data?: SubgraphData; errors?: unknown[] };
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  return json.data ?? {};
}

/** corruption subgraph URL derived from main bridgeworld endpoint */
export function corruptionSubgraphUrl(mainUrl: string): string {
  return mainUrl.replace(/bridgeworld\/?$/i, 'bridgeworld-corruption');
}

export async function hasGenesisLegion(
  wallets: string[],
  subgraphUrl: string,
): Promise<boolean> {
  const normalized = wallets
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^0x[a-f0-9]{40}$/.test(w));
  if (normalized.length === 0) return false;

  const primary = await querySubgraph(subgraphUrl, GENESIS_LEGION_QUERY(normalized));
  if (
    (primary.userTokens?.length ?? 0) > 0 ||
    (primary.crafts?.length ?? 0) > 0 ||
    (primary.advancedQuests?.length ?? 0) > 0 ||
    (primary.stakedTokens?.length ?? 0) > 0
  ) {
    return true;
  }

  try {
    const corruption = await querySubgraph(
      corruptionSubgraphUrl(subgraphUrl),
      CRYPTS_SQUAD_QUERY(normalized),
    );
    const tokenIds = (corruption.cryptsSquads ?? []).flatMap(
      (s) => s.characters?.map((c) => c.tokenId) ?? [],
    );
    if (tokenIds.length === 0) return false;

    const tokens = await querySubgraph(subgraphUrl, TOKENS_BY_ID_QUERY(tokenIds));
    return (tokens.tokens?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

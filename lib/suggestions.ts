export const SUGGESTION_BLOCKERS = ["Não, mas seria ótimo ter", "Sim, preciso disso pra usar"] as const;

export type SuggestionBlocker = (typeof SUGGESTION_BLOCKERS)[number];

export function isSuggestionBlocker(value: string): value is SuggestionBlocker {
  return (SUGGESTION_BLOCKERS as readonly string[]).includes(value);
}

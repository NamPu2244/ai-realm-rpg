// Cinematic FX vocabulary + sanitizers.
//
// The extraction model emits these tags per turn (see buildExtractionPrompt). The set is
// FIXED and closed so the client can render every value — the AI is a hostile input, so any
// value outside these lists is dropped. Shared by applyGameResult (writes the store) and
// FXManager (renders). Keep the three lists in sync with the CSS in globals.css and the
// extraction prompt schema.

export const ENVIRONMENT_FX = ['rain', 'snow', 'fog', 'embers'] as const; // ambient, persistent
export const PLAYER_CONDITIONS = ['dizzy', 'poisoned', 'drunk'] as const;  // screen overlay, persistent
export const IMPACT_FX = ['shake', 'flash'] as const;                      // one-shot, fires this turn

export type EnvironmentFx = typeof ENVIRONMENT_FX[number];
export type PlayerCondition = typeof PLAYER_CONDITIONS[number];
export type ImpactFx = typeof IMPACT_FX[number];

const has = (list: readonly string[], v: unknown): v is string => typeof v === 'string' && list.includes(v);

export function sanitizeEnvironmentFx(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x) => has(ENVIRONMENT_FX, x)))] as string[] : [];
}

export function sanitizePlayerCondition(v: unknown): string {
  return has(PLAYER_CONDITIONS, v) ? v : '';
}

export function sanitizeImpactFx(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x) => has(IMPACT_FX, x)))] as string[] : [];
}

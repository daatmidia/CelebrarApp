export const HELP_EMAIL = "contato@celebrar.app";

export const HELP_TOPICS = ["Dúvida", "Problema", "Sugestão", "Pagamento", "Outro"] as const;

export type HelpTopic = (typeof HELP_TOPICS)[number];

export function isHelpTopic(value: string): value is HelpTopic {
  return (HELP_TOPICS as readonly string[]).includes(value);
}

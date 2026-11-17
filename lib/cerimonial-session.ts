export const CERIMONIAL_SESSION_KEY = "celebrar-cerimonial-session";
export const CERIMONIAL_ACCOUNTS_KEY = "celebrar-cerimonial-contas";

export const CERIMONIAL_SEED = {
  email: "aline@celebrar.app",
  password: "celebrar",
  name: "Aline Cristiane",
};

export type CerimonialConta = {
  email: string;
  password: string;
  name: string;
};

export type CerimonialSession = {
  email: string;
  name: string;
};

function readAccounts(): CerimonialConta[] {
  try {
    const raw = localStorage.getItem(CERIMONIAL_ACCOUNTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as CerimonialConta[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function matchCerimonialAccount(email: string, password: string): CerimonialConta | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === CERIMONIAL_SEED.email && password === CERIMONIAL_SEED.password) {
    return CERIMONIAL_SEED;
  }
  return readAccounts().find((conta) => conta.email === normalized && conta.password === password) ?? null;
}

export function saveCerimonialAccount(conta: CerimonialConta): string | null {
  const email = conta.email.trim().toLowerCase();
  const name = conta.name.trim();
  if (!name || !email || !conta.password) return "Preencha nome, e-mail e senha.";
  if (!email.includes("@")) return "Use um e-mail válido.";
  if (email === CERIMONIAL_SEED.email || readAccounts().some((item) => item.email === email)) {
    return "Já existe uma conta com esse e-mail.";
  }
  const next = [...readAccounts(), { email, password: conta.password, name }];
  localStorage.setItem(CERIMONIAL_ACCOUNTS_KEY, JSON.stringify(next));
  return null;
}

export function readCerimonialSession(): CerimonialSession | null {
  try {
    const raw = localStorage.getItem(CERIMONIAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CerimonialSession;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCerimonialSession(conta: Pick<CerimonialConta, "email" | "name">) {
  const session: CerimonialSession = { email: conta.email, name: conta.name };
  localStorage.setItem(CERIMONIAL_SESSION_KEY, JSON.stringify(session));
}

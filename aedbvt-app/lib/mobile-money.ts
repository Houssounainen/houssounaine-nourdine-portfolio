export type Operator = "mvola" | "orange_money" | "airtel_money";

export const OPERATORS: Record<Operator, { label: string; short: string; ussd: string; prefixes: string[]; settingKey: string; color: string }> = {
  mvola: { label: "MVola", short: "MVola", ussd: "#111#", prefixes: ["034", "038"], settingKey: "mobile_money_mvola", color: "#f6c100" },
  orange_money: { label: "Orange Money", short: "Orange", ussd: "#144#", prefixes: ["032", "037"], settingKey: "mobile_money_orange", color: "#ff7900" },
  airtel_money: { label: "Airtel Money", short: "Airtel", ussd: "*436#", prefixes: ["033"], settingKey: "mobile_money_airtel", color: "#e40000" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: "" | "ok" | "pinned" | "danger" }> = {
  initiated: { label: "À payer", tone: "" },
  submitted: { label: "En vérification", tone: "pinned" },
  pending_provider: { label: "Confirmation sur le téléphone", tone: "pinned" },
  confirmed: { label: "Validé", tone: "ok" },
  rejected: { label: "Refusé", tone: "danger" },
  cancelled: { label: "Annulé", tone: "" },
  failed: { label: "Échec", tone: "danger" },
};

export function isOperator(value: unknown): value is Operator {
  return typeof value === "string" && value in OPERATORS;
}

/** Normalise un numéro malgache : 034 12 345 67 → 0341234567. */
export function normalizePhone(value: string) {
  let digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+261")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("261") && digits.length === 12) digits = "0" + digits.slice(3);
  return digits.replace(/\D/g, "");
}

export function formatPhone(value: string) {
  const digits = normalizePhone(value);
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : value;
}

export function guessOperator(phone: string): Operator | null {
  const digits = normalizePhone(phone);
  return (Object.keys(OPERATORS) as Operator[]).find(key => OPERATORS[key].prefixes.some(prefix => digits.startsWith(prefix))) || null;
}

export function ussdHref(code: string) {
  return "tel:" + code.replace(/#/g, "%23");
}

export const ariary = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} Ar`;

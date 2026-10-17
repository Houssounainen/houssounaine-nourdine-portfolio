/**
 * Paiement marchand MVola (Telma) — API « Merchant Pay » v1.0.0.
 * Activé uniquement si les identifiants du compte marchand sont configurés :
 *   MVOLA_CONSUMER_KEY, MVOLA_CONSUMER_SECRET, MVOLA_MERCHANT_NUMBER, MVOLA_PARTNER_NAME,
 *   MVOLA_ENV = "sandbox" | "production" (défaut : sandbox).
 * Le membre reçoit une demande sur son téléphone et la confirme avec son code secret.
 * La notification de rappel n’étant pas signée, l’état est toujours revérifié auprès de l’API.
 */
const config = () => ({
  key: process.env.MVOLA_CONSUMER_KEY || "",
  secret: process.env.MVOLA_CONSUMER_SECRET || "",
  merchant: (process.env.MVOLA_MERCHANT_NUMBER || "").replace(/\D/g, ""),
  partner: process.env.MVOLA_PARTNER_NAME || "AEDBVT",
  base: process.env.MVOLA_ENV === "production" ? "https://api.mvola.mg" : "https://devapi.mvola.mg",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, ""),
});

export function isMvolaApiEnabled() {
  const c = config();
  return Boolean(c.key && c.secret && c.merchant && c.appUrl.startsWith("https://"));
}

let cachedToken: { value: string; expires: number } | null = null;

async function token() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const c = config();
  const response = await fetch(`${c.base}/token`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${c.key}:${c.secret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: "grant_type=client_credentials&scope=EXT_INT_MVOLA_SCOPE",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("MVOLA_TOKEN_" + response.status);
  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expires: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

function headers(accessToken: string, correlationId: string) {
  const c = config();
  return {
    Authorization: `Bearer ${accessToken}`,
    Version: "1.0",
    "X-CorrelationID": correlationId,
    UserLanguage: "FR",
    UserAccountIdentifier: `msisdn;${c.merchant}`,
    partnerName: c.partner,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  };
}

export async function requestMvolaPayment({ id, reference, amount, payerPhone, description }: { id: string; reference: string; amount: number; payerPhone: string; description: string }) {
  const c = config();
  const accessToken = await token();
  const response = await fetch(`${c.base}/mvola/mm/transactions/type/merchantpay/1.0.0/`, {
    method: "POST",
    headers: { ...headers(accessToken, id), "X-Callback-URL": `${c.appUrl}/api/payments/mvola/callback?id=${id}` },
    body: JSON.stringify({
      amount: String(Math.round(amount)),
      currency: "Ar",
      descriptionText: description.replace(/[^\w\s-]/g, "").slice(0, 50),
      requestingOrganisationTransactionReference: reference,
      requestDate: new Date().toISOString(),
      originalTransactionReference: reference,
      debitParty: [{ key: "msisdn", value: payerPhone }],
      creditParty: [{ key: "msisdn", value: c.merchant }],
      metadata: [{ key: "partnerName", value: c.partner }, { key: "fc", value: "USD" }, { key: "amountFc", value: "1" }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("MVOLA_REQUEST_" + response.status);
  return await response.json() as { status: string; serverCorrelationId: string; notificationMethod?: string };
}

export async function getMvolaStatus(serverCorrelationId: string) {
  const c = config();
  const accessToken = await token();
  const response = await fetch(`${c.base}/mvola/mm/transactions/type/merchantpay/1.0.0/status/${encodeURIComponent(serverCorrelationId)}`, {
    headers: headers(accessToken, crypto.randomUUID()),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("MVOLA_STATUS_" + response.status);
  return await response.json() as { status: "pending" | "completed" | "failed"; serverCorrelationId: string; objectReference?: string };
}

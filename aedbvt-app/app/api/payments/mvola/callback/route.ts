import { syncProviderPayment } from "@/lib/mobile-payments-server";

export const dynamic = "force-dynamic";

// Rappel MVola : le contenu n’étant pas signé, on ne s’y fie pas et on revérifie l’état auprès de l’API.
async function handle(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Invalid", { status: 400 });
  await syncProviderPayment(id).catch(() => null);
  return new Response(null, { status: 204 });
}

export const PUT = handle;
export const POST = handle;

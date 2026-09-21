import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simplePdf } from "@/lib/pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const { data: payment } = await supabase
    .from("payments")
    .select("id,amount,method,external_reference,receipt_number,paid_at,status,members(full_name,member_number,village),membership_dues_cycles(label)")
    .eq("id", id)
    .eq("status", "confirmed")
    .maybeSingle();

  if (!payment) return new NextResponse("Reçu introuvable", { status: 404 });

  const member = Array.isArray(payment.members) ? payment.members[0] : payment.members;
  const cycle = Array.isArray(payment.membership_dues_cycles) ? payment.membership_dues_cycles[0] : payment.membership_dues_cycles;
  const rows = [
    "Association des Etudiants de Darsalama et Bandrani-Vouani a Tulear (AEDBVT)",
    "",
    "Recu : " + (payment.receipt_number || "sans numero"),
    "Date : " + new Date(payment.paid_at || Date.now()).toLocaleDateString("fr-FR"),
    "Membre : " + (member?.full_name || "Membre"),
    "Numero membre : " + (member?.member_number || "-"),
    "Village : " + (member?.village || "-"),
    "Montant : " + Number(payment.amount).toLocaleString("fr-FR") + " Ar",
    "Moyen : " + payment.method,
    "Reference externe : " + (payment.external_reference || "-"),
    "Objet : " + (cycle?.label ? "cotisation " + cycle.label : "cotisation / paiement associatif"),
    "",
    "Ce document est un recu interne genere par l'application AEDBVT.",
  ];

  const pdf = simplePdf("Reçu AEDBVT", rows);
  const filename = (payment.receipt_number || "recu-aedbvt") + ".pdf";

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
      "Cache-Control": "private, no-store",
    },
  });
}

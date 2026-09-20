"use client";

export function MemberCardActions({ verificationUrl }: { verificationUrl: string }) {
  return (
    <div className="member-card-actions no-print">
      <button className="button secondary" type="button" onClick={() => window.print()}>Imprimer / enregistrer la carte</button>
      <a className="button primary" href={verificationUrl} target="_blank" rel="noreferrer">Vérifier la carte</a>
    </div>
  );
}

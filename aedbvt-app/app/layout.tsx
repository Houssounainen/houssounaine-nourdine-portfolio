import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AEDBVT", template: "%s · AEDBVT" },
  description: "Application de gestion de l’AEDBVT à Tuléar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <a className="skip-link" href="#contenu">Aller au contenu</a>
        {children}
      </body>
    </html>
  );
}

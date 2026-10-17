import type { Metadata, Viewport } from "next";
import { PwaBootstrap } from "@/components/pwa-bootstrap";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "./ui.css";
import "./app.css";
import "./s-social.css";
import "./s-home.css";
import "./s-shop.css";
import "./s-admin.css";

export const metadata: Metadata = {
  applicationName:"AEDBVT",
  title: { default: "AEDBVT", template: "%s · AEDBVT" },
  description: "Application de gestion de l’AEDBVT à Tuléar.",
  manifest:"/manifest.webmanifest",
  appleWebApp:{
    capable:true,
    title:"AEDBVT",
    statusBarStyle:"black-translucent",
  },
  icons:{
    icon:[{url:"/aedbvt-pwa.svg",type:"image/svg+xml"}],
    apple:[{url:"/aedbvt-logo.webp",type:"image/webp"}],
  },
};

export const viewport:Viewport={
  width:"device-width",
  initialScale:1,
  viewportFit:"cover",
  themeColor:"#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a className="skip-link" href="#contenu">Aller au contenu</a>
        <PwaBootstrap/>
        {children}
      </body>
    </html>
  );
}

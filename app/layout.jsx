import { cookies } from "next/headers";
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";

export const metadata = {
  title: "the cont. — estratégia tributária",
  description: "Ferramenta interna de preparação e condução de reuniões de planejamento tributário.",
};

export default function RootLayout({ children }) {
  const isAuthed = cookies().get("auth")?.value === process.env.APP_AUTH_SECRET;

  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-bg">
          <div className="brandbar">
            <div className="brandbar-logo">
              <span className="brand-the">the</span>
              <span className="brand-cont">cont<span className="brand-dot">.</span></span>
            </div>
            {isAuthed && <LogoutButton />}
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}

import "./globals.css";

export const metadata = {
  title: "Estratégia Tributária — uso interno",
  description: "Ferramenta interna de preparação e condução de reuniões de planejamento tributário.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-bg">{children}</div>
      </body>
    </html>
  );
}

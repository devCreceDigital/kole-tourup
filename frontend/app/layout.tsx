import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tottem Hub",
  description: "Plataforma de gestión de viajes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased">
        {children}
      </body>
    </html>
  );
}

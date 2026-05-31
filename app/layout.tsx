import "./globals.css";
export const metadata = {
  title: "Ds Cinema",
  icons: {
    icon: "/favicon.png", // Next.js сам найдет файл в app/
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

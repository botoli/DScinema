import "./globals.css";
import { Manrope, Onest } from "next/font/google";
import Providers from "./providers";

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-manrope",
  display: "swap",
});

const onest = Onest({
  subsets: ["cyrillic", "latin"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata = {
  title: "Ds Cinema",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${onest.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Gowun_Dodum } from "next/font/google";
import "./globals.css";
import { TzDate } from "./TzDate";

const dodum = Gowun_Dodum({ weight: "400", subsets: ["latin"], variable: "--font-dodum", preload: false });

export const metadata: Metadata = {
  title: "오늘의 일기",
  description: "질문에 답하다 보면 일기가 써져요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${dodum.variable}`}>
        <TzDate />
        {children}
      </body>
    </html>
  );
}

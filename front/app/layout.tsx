import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Marquee from "@/components/Marquee";
import Sparkles from "@/components/Sparkles";

export const metadata: Metadata = {
  title: "💖 Pinky Market — самый розовый маркетплейс",
  description:
    "Анонимный маркетплейс ношеного белья. Розовый, блестящий, как в 2004-м.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Sparkles />
        <Header />
        <Marquee text="💖✨ ДОБРО ПОЖАЛОВАТЬ В PINKY MARKET ✨💖 ~~~ ПОЛНАЯ АНОНИМНОСТЬ — НИКАКИХ EMAIL И ТЕЛЕФОНОВ ~~~ 🩲 НОВЫЕ ЛОТЫ КАЖДЫЙ ДЕНЬ 🩲 ~~~ САЙТ ЛУЧШЕ ВСЕГО СМОТРИТСЯ В INTERNET EXPLORER 5.5 (шутка) ~~~ 💕 18+ 💕" />
        <main className="container page-enter" style={{ paddingTop: 24 }}>
          {children}
        </main>
        <footer className="footer">
          <p className="neon" style={{ fontSize: 20 }}>
            PINKY MARKET
          </p>
          <p style={{ margin: "10px 0" }}>
            <span className="under-construction">🚧 UNDER CONSTRUCTION 🚧</span>
          </p>
          <p>
            Посетителей:{" "}
            <span className="visitor-counter">0013372</span>
          </p>
          <p style={{ marginTop: 10, fontSize: 13 }}>
            © 2026 · только 18+ · сделано с 💖 и блёстками
          </p>
        </footer>
      </body>
    </html>
  );
}

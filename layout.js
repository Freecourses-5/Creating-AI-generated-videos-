import "./globals.css";

export const metadata = {
  title: "Veo Studio",
  description: "AI Video Generator powered by Gemini Veo"
};

export default function RootLayout({ children }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
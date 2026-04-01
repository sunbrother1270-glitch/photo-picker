import "./globals.css";

export const metadata = {
  title: "Photo Picker",
  description: "여러 장의 사진 중 목적에 맞는 사진을 고르는 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'スポット探索マップ',
  description: '地図の中心周辺のスポットを半径指定で探索できます',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-zinc-50 text-zinc-900">
        <a href="#spot-results" className="skip-link">
          スポット一覧へスキップ
        </a>
        {children}
      </body>
    </html>
  );
}

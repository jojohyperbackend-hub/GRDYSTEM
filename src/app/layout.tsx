import type { Metadata } from "next"
import "@/styles/global.css"

export const metadata: Metadata = {
  title: "GRDYSTEM — Your Life Is The Game",
  description: "A gamified self-improvement OS. Build real skills. Complete real missions. Progress like an RPG character — except the character is you.",
  keywords: ["self-improvement", "gamification", "RPG", "productivity", "skill tree", "missions"],
  authors: [{ name: "GRDYSTEM" }],
  openGraph: {
    title: "GRDYSTEM — Your Life Is The Game",
    description: "Build real skills. Complete real missions. Level up in real life.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
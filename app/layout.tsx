import './globals.css'

export const metadata = { 
  title: "非上場株式評価(R6)", 
  description: "株主判定→特定会社等→会社規模→評価",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3b82f6"
}

export default function RootLayout({ children }:{children:React.ReactNode}) {
  return (
    <html lang="ja" className="scroll-smooth">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '2D → 3D Converter',
  description: 'Upload a 2D image and receive a downloadable 3D model file',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}

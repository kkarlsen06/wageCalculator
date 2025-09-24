import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


export default function RootLayout({ children }) {
  return <html lang="no"><body>{children}</body></html>;
  <body>
    {children}
    {/* place nav where you want it */}
    {/* <BottomNav /> */}
  </body>
}

import "./globals.css";
import "@/lib/css/index.css"; // LiftKit base
export const metadata={title:"Wage Calculator"}; 
export default function RootLayout({children}:
    {children:React.ReactNode})
    {
        return (
            <html lang="en">
                <body>{children}</body>
            </html>
        )
    }

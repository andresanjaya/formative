import './globals.css';
export const metadata = { title:'Formative — Design learning', description:'A guided place to learn and apply product design.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }

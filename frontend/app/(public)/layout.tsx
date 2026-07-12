import { NavbarPublico } from '@/components/public/NavbarPublico'
import { FooterPublico } from '@/components/public/FooterPublico'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavbarPublico />
      <main className="flex-1">{children}</main>
      <FooterPublico />
    </div>
  );
}

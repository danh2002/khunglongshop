import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SessionTimeoutWrapper from "@/components/SessionTimeoutWrapper";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getNavigationData } from "@/lib/navigation";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navigation = await getNavigationData();

  return (
    <LanguageProvider>
      <SessionTimeoutWrapper />
      <Header categories={navigation.categories} collectorSets={navigation.collectorSets} />
      {children}
      <Footer />
    </LanguageProvider>
  );
}

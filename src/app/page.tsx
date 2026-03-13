import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { SocialProof } from "@/components/landing/social-proof";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Footer } from "@/components/landing/footer";
import { ForWho } from "@/components/landing/for-who";
import { CallToAction } from "@/components/landing/call-to-action";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Features />
        <ForWho />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}

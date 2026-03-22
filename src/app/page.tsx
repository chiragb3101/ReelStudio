"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Film,
  Sparkles,
  Camera,
  Scissors,
  Calendar,
  ChevronRight,
  Play,
  Zap,
  BarChart3,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  const features = [
    {
      icon: Sparkles,
      title: "AI Script Writing",
      description:
        "Generate scroll-stopping scripts with segment-by-segment timing, emphasis words, and pacing control.",
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      icon: Camera,
      title: "Guided Shooting",
      description:
        "Teleprompter with pace tracking, emphasis highlights, and real-time speech transcription.",
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      icon: BarChart3,
      title: "Motion Graphics",
      description:
        "AI-generated kinetic text, counters, bullet lists, and data visualizations powered by Remotion.",
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
    },
    {
      icon: Type,
      title: "Smart Captions",
      description:
        "Speech-timed subtitles with karaoke, pop, and typewriter styles. Multiple font options.",
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      icon: Scissors,
      title: "Interactive Editing",
      description:
        "AI generates the initial cut, then you tweak — reorder scenes, change transitions, adjust captions.",
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
    {
      icon: Calendar,
      title: "One-Click Publish",
      description:
        "Generate thumbnails, captions with hashtags, and schedule directly to Instagram via Buffer.",
      color: "text-pink-400",
      bg: "bg-pink-400/10",
    },
  ];

  const steps = [
    { num: "01", label: "Idea & Research", desc: "AI researches your topic and finds the best angle" },
    { num: "02", label: "Script", desc: "Segmented script with timing and emphasis for each shot" },
    { num: "03", label: "Shoot", desc: "Guided recording with teleprompter and live transcription" },
    { num: "04", label: "Edit & Publish", desc: "Motion graphics, captions, thumbnails — done" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg">ReelStudio</span>
          </div>
          <Button
            onClick={() => router.push("/sign-up")}
            className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5"
          >
            Get Started
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 mb-6">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Powered by AI + Remotion</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            AI-Powered{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Reel Production
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            From idea to published Instagram Reel in minutes. AI writes your script,
            guides your shoot, generates motion graphics, and edits everything together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push("/sign-up")}
              size="lg"
              className="rounded-xl bg-primary hover:bg-primary/90 px-8 gap-2 text-base"
            >
              <Play className="w-4 h-4" />
              Start Creating
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-xl px-8 gap-2 text-base border-border/50"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Pipeline Steps */}
      <section className="py-16 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="text-4xl font-bold text-primary/20 mb-2">{step.num}</div>
                <h3 className="font-semibold mb-1">{step.label}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Create Viral Reels
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Professional-grade tools powered by AI. No editing experience required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/20 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-border/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Create Your Next Reel?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join creators using AI to produce professional Instagram Reels in minutes, not hours.
          </p>
          <Button
            onClick={() => router.push("/sign-up")}
            size="lg"
            className="rounded-xl bg-primary hover:bg-primary/90 px-10 gap-2 text-base"
          >
            Get Started Free
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Film className="w-4 h-4" />
            ReelStudio
          </div>
          <p className="text-xs text-muted-foreground">
            Built with Next.js, Remotion & Claude
          </p>
        </div>
      </footer>
    </div>
  );
}

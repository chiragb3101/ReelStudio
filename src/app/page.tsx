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
  ArrowRight,
  Star,
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
      gradient: "from-violet-500/20 to-purple-500/20",
      iconColor: "text-violet-400",
      border: "hover:border-violet-500/30",
    },
    {
      icon: Camera,
      title: "Guided Shooting",
      description:
        "Teleprompter with pace tracking, emphasis highlights, and real-time speech transcription.",
      gradient: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-400",
      border: "hover:border-blue-500/30",
    },
    {
      icon: BarChart3,
      title: "Motion Graphics",
      description:
        "AI-generated kinetic text, counters, bullet lists, and data visualizations powered by Remotion.",
      gradient: "from-cyan-500/20 to-teal-500/20",
      iconColor: "text-cyan-400",
      border: "hover:border-cyan-500/30",
    },
    {
      icon: Type,
      title: "Smart Captions",
      description:
        "Speech-timed subtitles with karaoke, pop, and typewriter styles. Multiple font options.",
      gradient: "from-emerald-500/20 to-green-500/20",
      iconColor: "text-emerald-400",
      border: "hover:border-emerald-500/30",
    },
    {
      icon: Scissors,
      title: "Interactive Editing",
      description:
        "AI generates the initial cut, then you tweak — reorder scenes, change transitions, adjust captions.",
      gradient: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
      border: "hover:border-amber-500/30",
    },
    {
      icon: Calendar,
      title: "One-Click Publish",
      description:
        "Generate thumbnails, captions with hashtags, and schedule directly to Instagram via Buffer.",
      gradient: "from-rose-500/20 to-pink-500/20",
      iconColor: "text-rose-400",
      border: "hover:border-rose-500/30",
    },
  ];

  const steps = [
    {
      num: "01",
      label: "Idea & Research",
      desc: "AI researches your topic and finds the best angle",
      icon: Sparkles,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      line: "from-violet-500 to-blue-500",
    },
    {
      num: "02",
      label: "Script",
      desc: "Segmented script with timing and emphasis for each shot",
      icon: Type,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      line: "from-blue-500 to-cyan-500",
    },
    {
      num: "03",
      label: "Shoot",
      desc: "Guided recording with teleprompter and live transcription",
      icon: Camera,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      line: "from-cyan-500 to-emerald-500",
    },
    {
      num: "04",
      label: "Edit & Publish",
      desc: "Motion graphics, captions, thumbnails — done",
      icon: Film,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      line: "",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background mesh gradient */}
      <div className="fixed inset-0 mesh-gradient-hero pointer-events-none" />
      <div className="fixed inset-0 noise-overlay pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/60 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/20">
              <Film className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Reel<span className="gradient-text">Studio</span>
            </span>
          </div>
          <Button
            onClick={() => router.push("/sign-up")}
            className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5 shadow-lg shadow-primary/20"
          >
            Get Started
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6">
        {/* Floating decorative elements */}
        <div className="absolute top-32 left-[10%] w-72 h-72 rounded-full bg-primary/5 blur-3xl float float-delay-1 pointer-events-none" />
        <div className="absolute top-48 right-[15%] w-56 h-56 rounded-full bg-accent/5 blur-3xl float float-delay-2 pointer-events-none" />
        <div className="absolute bottom-12 left-[40%] w-40 h-40 rounded-full bg-pink-500/5 blur-3xl float-slow float-delay-3 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full glass border border-primary/20 px-5 py-2 mb-8 animate-fade-in-up">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground/80">Powered by AI + Remotion</span>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              ))}
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.05] mb-8 animate-fade-in-up animate-delay-100">
            Create Viral Reels{" "}
            <br className="hidden sm:block" />
            <span className="gradient-text-hero">
              in Minutes
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up animate-delay-200">
            From idea to published Instagram Reel — AI writes your script,
            guides your shoot, generates motion graphics, and edits everything together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animate-delay-300">
            <Button
              onClick={() => router.push("/sign-up")}
              size="lg"
              className="rounded-2xl bg-primary hover:bg-primary/90 px-8 gap-2.5 text-base h-12 shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02]"
            >
              <Play className="w-4.5 h-4.5" />
              Start Creating — Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-2xl px-8 gap-2 text-base h-12 border-border/40 hover:border-primary/30 hover:bg-primary/5"
            >
              See How It Works
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pipeline Steps */}
      <section id="how-it-works" className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Four steps to a{" "}
              <span className="gradient-text">polished reel</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="relative group animate-fade-in-up"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                {/* Connecting line */}
                {i < steps.length - 1 && (
                  <div className={`hidden lg:block absolute top-8 left-[calc(50%+28px)] right-[-50%] h-px bg-gradient-to-r ${step.line} opacity-30`} />
                )}

                <div className="glass rounded-2xl p-6 text-center card-hover border border-border/30 hover:border-primary/20 relative overflow-hidden">
                  <div className={`w-14 h-14 rounded-2xl ${step.bg} flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
                    <step.icon className={`w-6 h-6 ${step.color}`} />
                  </div>
                  <div className={`text-xs font-bold ${step.color} tracking-widest mb-2`}>{step.num}</div>
                  <h3 className="font-semibold text-lg mb-2">{step.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Everything you need to{" "}
              <span className="gradient-text">create viral reels</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Professional-grade tools powered by AI. No editing experience required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`glass rounded-2xl p-7 border border-border/30 ${feature.border} transition-all card-hover spotlight-card group animate-fade-in-up`}
                style={{ animationDelay: `${(i + 1) * 80}ms` }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                  e.currentTarget.style.setProperty("--y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
                }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <feature.icon className={`w-5.5 h-5.5 ${feature.iconColor}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Ready to create your{" "}
            <span className="gradient-text">next reel?</span>
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg leading-relaxed">
            Join creators using AI to produce professional Instagram Reels in minutes, not hours.
          </p>
          <Button
            onClick={() => router.push("/sign-up")}
            size="lg"
            className="rounded-2xl bg-primary hover:bg-primary/90 px-10 gap-2.5 text-base h-12 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] transition-all"
          >
            Get Started Free
            <ArrowRight className="w-4.5 h-4.5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/20 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
              <Film className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">ReelStudio</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built with Next.js, Remotion & Claude
          </p>
        </div>
      </footer>
    </div>
  );
}

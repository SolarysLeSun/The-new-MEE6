
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import RippleGrid from "@/components/ripple-grid";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import ShinyText from "@/components/ui/shiny-text";
import { Hammer, ShieldCheck, Sparkles, Bot, Award, Code } from 'lucide-react';
import { motion } from 'framer-motion';

const featureScreens = [
    {
        icon: Hammer,
        title: "Modération Intelligente",
        description: "De l'anti-toxicité IA aux sanctions automatiques, gardez une communauté saine sans effort.",
        color: "hsl(var(--primary))",
    },
    {
        icon: ShieldCheck,
        title: "Sécurité Maximale",
        description: "Anti-Raid, Anti-Bot, Captcha, et analyse de liens/images par IA pour une forteresse imprenable.",
        color: "#3498db",
    },
    {
        icon: Sparkles,
        title: "Personnages & Agents IA",
        description: "Donnez vie à votre serveur avec des IA dotées de personnalités, de mémoires et de relations uniques.",
        color: "#9b59b6",
    },
    {
        icon: Award,
        title: "Engagement & Niveaux",
        description: "Récompensez l'activité de vos membres avec un système de niveaux complet et des rôles à la clé.",
        color: "#f1c40f",
    },
     {
        icon: Bot,
        title: "Automatisation Puissante",
        description: "Salons privés, rôles automatiques, annonces, et bien plus pour un serveur qui se gère (presque) tout seul.",
        color: "#2ecc71",
    },
    {
        icon: Code,
        title: "Outils & Créativité",
        description: "Constructeur d'embeds, génération de contenu par IA, commandes personnalisées... La seule limite est votre imagination.",
        color: "#e74c3c",
    }
];

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.1,
      type: "spring",
      stiffness: 100,
    },
  }),
};

export default function PresentationScreenPage() {
    return (
    <div className="relative min-h-screen w-full bg-black text-foreground overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-70">
        <RippleGrid
          enableRainbow={true}
          gridColor="#2c3e50"
          rippleIntensity={0.07}
          gridSize={30}
          gridThickness={15}
          fadeDistance={1.5}
          vignetteStrength={2}
          glowIntensity={0.1}
          opacity={1}
          gridRotation={0}
          mouseInteraction={true}
          mouseInteractionRadius={0.5}
        />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-16 sm:py-24 flex flex-col items-center justify-center h-screen">
         <PageTransitionWrapper>
            <div className="text-center mb-16">
                 <h1 className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tight text-white">
                    <ShinyText text="MARCUS" className="text-primary"/>
                </h1>
                <p className="mt-4 text-xl md:text-2xl text-muted-foreground">
                    Une nouvelle ère pour la gestion de communautés Discord.
                </p>
            </div>
            
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl"
                variants={{
                    visible: { transition: { staggerChildren: 0.1 } }
                }}
                initial="hidden"
                animate="visible"
            >
                {featureScreens.map((feature, index) => (
                    <motion.div key={feature.title} custom={index} variants={cardVariants}>
                        <Card className="h-full bg-background/50 backdrop-blur-md border-white/10 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-2 shadow-2xl shadow-black/50">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-card rounded-lg" style={{ boxShadow: `0 0 20px ${feature.color}30` }}>
                                        <feature.icon className="w-8 h-8" style={{ color: feature.color }} />
                                    </div>
                                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-lg">{feature.description}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </PageTransitionWrapper>
      </main>
    </div>
  );
}

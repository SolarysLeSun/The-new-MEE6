
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RippleGrid from "@/components/ripple-grid";
import { PageTransitionWrapper } from "@/components/page-transition-wrapper";
import { Rocket } from "lucide-react";
import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import html from 'remark-html';

async function getMarkdownContent() {
    const filePath = path.join(process.cwd(), 'FEATURES.md');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const processedContent = await remark().use(html).process(fileContents);
    return processedContent.toString();
}

export default async function FeaturesPage() {
    const contentHtml = await getMarkdownContent();

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground">
            <div className="absolute inset-0 z-0">
                <RippleGrid
                    gridColor="#ffffff10"
                    rippleIntensity={0.03}
                    gridSize={25}
                    fadeDistance={1}
                    vignetteStrength={1.5}
                />
            </div>
            <AppHeader />
            <main className="relative z-10 container mx-auto px-4 py-24 sm:py-32">
                <PageTransitionWrapper>
                    <div className="text-center mb-16">
                         <div className="flex justify-center mb-4">
                            <div className="p-3 bg-primary/10 rounded-full border-2 border-primary/30">
                                <Rocket className="h-8 w-8 text-primary"/>
                            </div>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">Fonctionnalités de Marcus</h1>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                            Découvrez tout ce que Marcus peut faire pour votre serveur, de la version gratuite aux avantages exclusifs Premium.
                        </p>
                    </div>

                    <Card className="bg-card/60 backdrop-blur-sm border-white/10 max-w-5xl mx-auto">
                        <CardContent className="p-6 sm:p-8">
                             <div 
                                className="prose prose-invert lg:prose-xl max-w-none"
                                dangerouslySetInnerHTML={{ __html: contentHtml }} 
                             />
                        </CardContent>
                    </Card>
                </PageTransitionWrapper>
            </main>
        </div>
    );
}

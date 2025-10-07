'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Dices, CircleDot } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface Wheel {
    id: string;
    name: string;
    options: string[];
}

interface FortuneWheelConfig {
    enabled: boolean;
    wheels: Wheel[];
}

function FortuneWheelPageSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                 <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                 </div>
                 <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
}

export default function FortuneWheelPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<FortuneWheelConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const configRes = await fetch(`${API_URL}/get-config/${serverId}/fortune-wheel`);
                if (!configRes.ok) throw new Error("Impossible de récupérer les données.");
                const configData = await configRes.json();
                setConfig(configData);
            } catch (error: any) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);

    const saveConfig = async (newConfig: FortuneWheelConfig) => {
        setConfig(newConfig); // Optimistic update
         try {
            await fetch(`${API_URL}/update-config/${serverId}/fortune-wheel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleToggleModule = (enabled: boolean) => {
        if (!config) return;
        saveConfig({ ...config, enabled });
    };

    const handleAddWheel = () => {
        if (!config) return;
        const newWheel: Wheel = {
            id: uuidv4(),
            name: 'Nouvelle Roue',
            options: ['Option 1', 'Option 2'],
        };
        saveConfig({ ...config, wheels: [...(config.wheels || []), newWheel] });
    };

    const handleUpdateWheel = (updatedWheel: Wheel) => {
        if (!config) return;
        const newWheels = config.wheels.map(wheel => wheel.id === updatedWheel.id ? updatedWheel : wheel);
        saveConfig({ ...config, wheels: newWheels });
    };

    const handleDeleteWheel = (wheelId: string) => {
        if (!config) return;
        saveConfig({ ...config, wheels: config.wheels.filter(wheel => wheel.id !== wheelId) });
    };

    if (loading || !config) {
        return <FortuneWheelPageSkeleton />;
    }

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-5xl">
        <div className="flex items-start justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Dices/>Roue de la Fortune</h1>
                <p className="text-muted-foreground mt-2">
                    Créez des roues personnalisées pour vos événements et animations.
                </p>
            </div>
             <div className="flex items-center space-x-4">
                 <Switch id="enable-module" checked={config.enabled} onCheckedChange={handleToggleModule} />
                 <Button onClick={handleAddWheel}>
                    <PlusCircle className="mr-2"/>
                    Créer une roue
                </Button>
            </div>
        </div>
        
        <Separator />
        
        {config.wheels.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Dices className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Aucune roue définie</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Utilisez le bouton "Créer une roue" pour commencer.
                </p>
            </div>
        ) : (
            <div className="grid md:grid-cols-2 gap-6">
                {config.wheels.map(wheel => (
                    <WheelCard 
                        key={wheel.id} 
                        wheel={wheel} 
                        onUpdate={handleUpdateWheel}
                        onDelete={() => handleDeleteWheel(wheel.id)}
                    />
                ))}
            </div>
        )}
    </PageTransitionWrapper>
  );
}

function WheelCard({ wheel, onUpdate, onDelete }: { wheel: Wheel, onUpdate: (wheel: Wheel) => void, onDelete: () => void }) {
    const [name, setName] = useState(wheel.name);
    
    const handleNameBlur = () => {
        onUpdate({ ...wheel, name });
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...wheel.options];
        newOptions[index] = value;
        onUpdate({ ...wheel, options: newOptions });
    };
    
    const addOption = () => {
        onUpdate({ ...wheel, options: [...wheel.options, ''] });
    };

    const removeOption = (index: number) => {
        const newOptions = wheel.options.filter((_, i) => i !== index);
        onUpdate({ ...wheel, options: newOptions });
    };

    return (
        <Card className="bg-card/50 flex flex-col">
            <CardHeader className="flex-row items-center justify-between">
                <Input value={name} onChange={e => setName(e.target.value)} onBlur={handleNameBlur} className="text-xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" />
                <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive"/></Button>
            </CardHeader>
            <CardContent className="space-y-3 flex-grow">
                <Label>Options</Label>
                {wheel.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                         <CircleDot className="w-4 h-4 text-muted-foreground shrink-0"/>
                        <Input value={option} onBlur={(e) => handleOptionChange(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                        <Button variant="ghost" size="icon" onClick={() => removeOption(index)} disabled={wheel.options.length <= 1}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                ))}
            </CardContent>
             <CardContent>
                <Button variant="outline" className="w-full" onClick={addOption}>
                    <PlusCircle className="mr-2"/>
                    Ajouter une option
                </Button>
            </CardContent>
        </Card>
    );
}

if (typeof window !== 'undefined') {
    (window as any).uuidv4 = uuidv4;
}

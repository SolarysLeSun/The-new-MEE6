
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, History } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { v4 as uuidv4 } from 'uuid';
import type { CustomWheel } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

function PageSkeleton() {
    return (
        <div className="space-y-8">
             <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
            </div>
            <Separator />
            <div className="flex justify-end">
                 <Skeleton className="h-10 w-36" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
}

export default function WheelOfFortunePage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [wheels, setWheels] = useState<CustomWheel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchWheels = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_URL}/wheels/${serverId}`);
                if (!response.ok) throw new Error('Failed to fetch wheels');
                const data = await response.json();
                setWheels(data);
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger les roues.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchWheels();
    }, [serverId, toast]);

    const saveWheels = async (newWheels: CustomWheel[]) => {
        setWheels(newWheels); // Optimistic update
        try {
            await fetch(`${API_URL}/wheels/${serverId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWheels),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };

    const handleAddWheel = () => {
        const newWheel: CustomWheel = { id: uuidv4(), name: 'Nouvelle Roue', options: ['Option 1', 'Option 2'] };
        saveWheels([...wheels, newWheel]);
    };

    const handleUpdateWheel = (updatedWheel: CustomWheel) => {
        saveWheels(wheels.map(w => w.id === updatedWheel.id ? updatedWheel : w));
    };

    const handleDeleteWheel = (wheelId: string) => {
        saveWheels(wheels.filter(w => w.id !== wheelId));
    };

    if (loading) {
        return <PageSkeleton />;
    }

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Roue de la Fortune</h1>
                <p className="text-muted-foreground mt-2">
                    Créez et gérez des roues de la fortune personnalisées pour vos événements et tirages au sort.
                </p>
            </div>
            
            <Separator />

            <div className="flex justify-end">
                <Button onClick={handleAddWheel}>
                    <PlusCircle className="mr-2" /> Créer une roue
                </Button>
            </div>

            <div className="space-y-6">
                 {wheels.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <History className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Aucune roue définie</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Utilisez le bouton "Créer une roue" pour commencer.
                        </p>
                    </div>
                 ) : (
                    wheels.map(wheel => (
                        <WheelEditor key={wheel.id} wheel={wheel} onUpdate={handleUpdateWheel} onDelete={() => handleDeleteWheel(wheel.id)} />
                    ))
                 )}
            </div>

        </PageTransitionWrapper>
    );
}

// --- WheelEditor Component ---
interface WheelEditorProps {
    wheel: CustomWheel;
    onUpdate: (wheel: CustomWheel) => void;
    onDelete: () => void;
}

function WheelEditor({ wheel, onUpdate, onDelete }: WheelEditorProps) {

    const handleNameChange = (newName: string) => {
        onUpdate({ ...wheel, name: newName });
    };

    const handleOptionsChange = (index: number, value: string) => {
        const newOptions = [...wheel.options];
        newOptions[index] = value;
        onUpdate({ ...wheel, options: newOptions });
    };

    const handleAddOption = () => {
        onUpdate({ ...wheel, options: [...wheel.options, `Nouvelle Option`] });
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = wheel.options.filter((_, i) => i !== index);
        onUpdate({ ...wheel, options: newOptions });
    };

    return (
        <Card className="bg-card/50">
            <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1">
                    <Input 
                        value={wheel.name} 
                        onChange={e => handleNameChange(e.target.value)} 
                        className="text-xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" />
                    <CardDescription>
                        Utilisez <code className="bg-muted px-1 py-0.5 rounded-md text-foreground">/roue lancer {wheel.name}</code> pour la faire tourner.
                    </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive"/></Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <Label>Options</Label>
                <div className="space-y-2">
                    {wheel.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input 
                                value={option}
                                onChange={(e) => handleOptionsChange(index, e.target.value)}
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(index)}><Trash2 className="w-4 h-4"/></Button>
                        </div>
                    ))}
                </div>
                 <Button variant="outline" size="sm" onClick={handleAddOption}><PlusCircle className="mr-2"/> Ajouter une option</Button>
            </CardContent>
        </Card>
    );
}

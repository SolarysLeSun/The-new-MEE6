

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Ticket, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import type { CustomField } from '@/types';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface PrivateRoomsConfig {
    enabled: boolean;
    creation_channel: string | null;
    category_id: string | null;
    embed_message: string;
    channel_name_format: string;
    modal_title: string;
    custom_fields: CustomField[];
    archive_summary: boolean;
    command_permissions: { [key: string]: string | null };
}

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}

interface DiscordRole {
    id: string;
    name: string;
}

const privateRoomCommands = [
  {
    name: '/addprivate',
    key: 'addprivate',
    description: 'Envoie le panneau de création de salon privé.',
  },
  {
    name: '/privateresum',
    key: 'privateresum',
    description: "Génère un résumé IA d'un salon avant son archivage.",
  },
];

function PrivateRoomsPageSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-full mt-2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default function PrivateRoomsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<PrivateRoomsConfig | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [categories, setCategories] = useState<DiscordChannel[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!serverId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, serverDetailsRes] = await Promise.all([
                    fetch(`${API_URL}/get-config/${serverId}/private-rooms`),
                    fetch(`${API_URL}/get-server-details/${serverId}`)
                ]);
                if (!configRes.ok || !serverDetailsRes.ok) throw new Error('Failed to fetch data');

                const configData = await configRes.json();
                const serverDetailsData = await serverDetailsRes.json();

                setConfig(configData);
                setChannels(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 0)); // Text channels
                setCategories(serverDetailsData.channels.filter((c: DiscordChannel) => c.type === 4)); // Category channels
                setRoles(serverDetailsData.roles);

            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la configuration.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [serverId, toast]);
    
    const saveConfig = async (newConfig: PrivateRoomsConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/private-rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof PrivateRoomsConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };
    
    const handleCustomFieldChange = (index: number, field: 'label' | 'placeholder', value: string) => {
        if (!config || !config.custom_fields) return;
        const newFields = [...config.custom_fields];
        newFields[index] = { ...newFields[index], [field]: value };
        handleValueChange('custom_fields', newFields);
    };

    const addCustomField = () => {
        if (!config || (config.custom_fields && config.custom_fields.length >= 3)) {
            toast({ title: "Limite atteinte", description: "Vous ne pouvez pas ajouter plus de 3 champs personnalisés.", variant: "destructive"});
            return;
        };
        const newField: CustomField = { id: `custom_field_${Date.now()}`, label: '', placeholder: '' };
        handleValueChange('custom_fields', [...(config.custom_fields || []), newField]);
    };

    const removeCustomField = (id: string) => {
        if (!config) return;
        handleValueChange('custom_fields', config.custom_fields.filter(field => field.id !== id));
    };

    const handlePermissionChange = (commandKey: string, roleId: string) => {
        if (!config) return;
        const newPermissions = { ...config.command_permissions, [commandKey]: roleId === 'none' ? null : roleId };
        handleValueChange('command_permissions', newPermissions);
    };

    if (loading || !config) {
        return <PrivateRoomsPageSkeleton />;
    }
    
    const channelOptions = [
        { value: 'none', label: 'Aucun' },
        ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
    ];

    const categoryOptions = [
        { value: 'none', label: 'Aucune' },
        ...categories.map(c => ({ value: c.id, label: c.name }))
    ];
    
    const roleOptions = [
        { value: 'none', label: 'Admin seulement' },
        ...roles.filter(r => r.name !== '@everyone').map(r => ({ value: r.id, label: r.name }))
    ];

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Salons Privés / Tickets</h1>
        <p className="text-muted-foreground mt-2">
          Configurez le système de création de salons privés pour les tickets ou
          les groupes.
        </p>
      </div>

      <Separator />

      {/* Section Options */}
      <Card>
        <CardHeader>
          <CardTitle>Options des Salons Privés</CardTitle>
          <CardDescription>
            Personnalisez le fonctionnement de la création de salons.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
              <div>
                  <Label htmlFor="enable-module" className="font-bold">Activer le module</Label>
              </div>
              <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="creation-channel">Salon de création</Label>
               <Combobox
                options={channelOptions}
                value={config.creation_channel || 'none'}
                onChange={(value) => handleValueChange('creation_channel', value === 'none' ? null : value)}
                placeholder="Sélectionner un salon"
                searchPlaceholder="Rechercher un salon..."
                emptyPlaceholder="Aucun salon trouvé."
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="private-category">Catégorie des salons</Label>
              <Combobox
                options={categoryOptions}
                value={config.category_id || 'none'}
                onChange={(value) => handleValueChange('category_id', value === 'none' ? null : value)}
                placeholder="Sélectionner une catégorie"
                searchPlaceholder="Rechercher une catégorie..."
                emptyPlaceholder="Aucune catégorie trouvée."
              />
            </div>
          </div>
          
          <Separator />

          <div className="space-y-2">
            <Label htmlFor="channel-name-format">Format du nom du salon</Label>
            <p className="text-sm text-muted-foreground/80">
              Variables: {'{user}'}, {'{id}'}, {'{random}'}, {'{champ1}'}, {'{champ2}'}, {'{champ3}'}.
            </p>
            <Input
              id="channel-name-format"
              value={config.channel_name_format || ''}
              onBlur={(e) => handleValueChange('channel_name_format', e.target.value)}
              placeholder="ticket-{user}-{champ1}"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="embed-message">Message de l'embed</Label>
            <Textarea
              id="embed-message"
              placeholder="Cliquez sur le bouton pour créer un nouveau ticket..."
              rows={3}
              defaultValue={config.embed_message}
              onBlur={(e) => handleValueChange('embed_message', e.target.value)}
            />
          </div>
          <Separator />
           <div className="space-y-2">
                <Label htmlFor="modal-title">Titre du formulaire de création</Label>
                <Input id="modal-title" value={config.modal_title || ''} onBlur={(e) => handleValueChange('modal_title', e.target.value)} placeholder="Créer un nouveau ticket" />
           </div>
            <div className="space-y-4">
                 <Label className="font-bold">Champs du formulaire (Max 3)</Label>
                 {config.custom_fields && config.custom_fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg bg-card-foreground/5 space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="font-semibold">Champ {index + 1} (utilisé comme {'{champ'}{index+1}{'}'})</Label>
                            <Button variant="ghost" size="icon" onClick={() => removeCustomField(field.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                        <Input 
                            placeholder="Titre du champ (ex: Sujet de votre ticket)" 
                            defaultValue={field.label}
                            onBlur={(e) => handleCustomFieldChange(index, 'label', e.target.value)}
                        />
                        <Input 
                            placeholder="Texte d'aide (ex: Soyez bref et précis)" 
                            defaultValue={field.placeholder}
                            onBlur={(e) => handleCustomFieldChange(index, 'placeholder', e.target.value)}
                        />
                    </div>
                ))}
                <Button variant="outline" className="w-full" onClick={addCustomField} disabled={(config.custom_fields?.length || 0) >= 3}>
                    <PlusCircle className="mr-2" />
                    Ajouter un champ
                </Button>
            </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-ai-summary" className="font-bold">Résumé IA (Bientôt)</Label>
              <p className="text-sm text-muted-foreground/80">
                Générer un résumé par l'IA lors de l'archivage d'un salon.
              </p>
            </div>
            <Switch 
                id="enable-ai-summary" 
                checked={config.archive_summary} 
                onCheckedChange={(val) => handleValueChange('archive_summary', val)}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Section Commandes */}
      <Card>
        <CardHeader><CardTitle>Commandes du Module</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {privateRoomCommands.map((command) => (
            <div key={command.key} className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
                <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    <span>{command.name}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground">{command.description}</p>
              </div>
                <div className="w-full md:w-60">
                     <Label className="text-xs font-medium">Rôle minimum requis</Label>
                    <Combobox
                        options={roleOptions}
                        value={config.command_permissions?.[command.key] || 'none'}
                        onChange={(value) => handlePermissionChange(command.key, value)}
                        placeholder="Sélectionner un rôle"
                    />
                </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageTransitionWrapper>
  );
}

if (typeof window !== 'undefined') {
    (window as any).uuidv4 = uuidv4;
}



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
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

// Types
interface TicketsConfig {
    enabled: boolean;
    creation_channel: string | null;
    category_id: string | null;
    log_channel_id: string | null;
    moderator_roles: string[];
    mention_moderators: boolean;
    
    modal_title: string;
    embed_message: string;
    channel_name_format: string;
    custom_fields: CustomField[];

    validation_enabled: boolean;
    validation_channel_id: string | null;
    confirmation_message: string;

    private_thread_enabled: boolean;
    private_thread_name_format: string;

    archive_summary: boolean;
    auto_delete_on_close: boolean;

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

const ticketCommands = [
  {
    name: '/addticket',
    key: 'addticket',
    description: 'Envoie le panneau de création de ticket.',
  },
  {
    name: '/ticket',
    key: 'ticket',
    description: "Gère les tickets (fermeture, ajout/retrait de membres).",
  },
];

function TicketsPageSkeleton() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    )
}

export default function TicketsPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [config, setConfig] = useState<TicketsConfig | null>(null);
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
                    fetch(`${API_URL}/get-config/${serverId}/private-rooms`), // Keep old name for backward compatibility during transition
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
    
    const saveConfig = async (newConfig: TicketsConfig) => {
        setConfig(newConfig); // Optimistic update
        try {
            await fetch(`${API_URL}/update-config/${serverId}/private-rooms`, { // Keep old name for API
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig),
            });
        } catch (error) {
            toast({ title: "Erreur de sauvegarde", variant: "destructive" });
        }
    };
    
    const handleValueChange = (key: keyof TicketsConfig, value: any) => {
        if (!config) return;
        saveConfig({ ...config, [key]: value });
    };
    
    const handleCustomFieldChange = (index: number, field: keyof CustomField, value: string | boolean) => {
        if (!config || !config.custom_fields) return;
        const newFields = [...config.custom_fields];
        (newFields[index] as any)[field] = value;
        handleValueChange('custom_fields', newFields);
    };

    const addCustomField = () => {
        if (!config || (config.custom_fields && config.custom_fields.length >= 3)) {
            toast({ title: "Limite atteinte", description: "Vous ne pouvez pas ajouter plus de 3 champs personnalisés.", variant: "destructive"});
            return;
        };
        const newField: CustomField = { id: `custom_field_${Date.now()}`, label: '', placeholder: '', required: true };
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
        return <TicketsPageSkeleton />;
    }
    
    const channelOptions = [
        { value: 'none', label: 'Aucun' },
        ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
    ];

    const categoryOptions = [
        { value: 'none', label: 'Aucune' },
        ...categories.map(c => ({ value: c.id, label: c.name }))
    ];
    
    const roleOptions = roles.filter(r => r.name !== '@everyone').map(r => ({ value: r.id, label: r.name }));
    const modRoleOptions = [{ value: 'none', label: 'Admin seulement' }, ...roleOptions];

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Système de Tickets</h1>
        <p className="text-muted-foreground mt-2">
          Configurez un système de tickets complet pour le support ou les demandes privées.
        </p>
      </div>

      <Separator />

      <Card>
          <CardHeader>
              <CardTitle>Configuration Générale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Label htmlFor="enable-module" className="font-bold">Activer le module de Tickets</Label>
                </div>
                <Switch id="enable-module" checked={config.enabled} onCheckedChange={(val) => handleValueChange('enabled', val)} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Rôles modérateurs de tickets</Label>
              <p className="text-sm text-muted-foreground">Ces rôles auront accès à tous les tickets et aux commandes de gestion.</p>
              <MultiSelectCombobox options={roleOptions} selected={config.moderator_roles || []} onSelectedChange={(val) => handleValueChange('moderator_roles', val)} />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="mention-mods">Mentionner les rôles modérateurs à l'ouverture</Label>
                <Switch id="mention-mods" checked={config.mention_moderators} onCheckedChange={(val) => handleValueChange('mention_moderators', val)} />
            </div>
          </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Création des Tickets</CardTitle>
          <CardDescription>
            Configurez le panneau et le formulaire que les utilisateurs verront pour créer un ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="creation-channel">Salon du panneau de création</Label>
               <Combobox
                options={channelOptions}
                value={config.creation_channel || 'none'}
                onChange={(value) => handleValueChange('creation_channel', value === 'none' ? null : value)}
                placeholder="Sélectionner un salon"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="private-category">Catégorie des tickets</Label>
              <Combobox
                options={categoryOptions}
                value={config.category_id || 'none'}
                onChange={(value) => handleValueChange('category_id', value === 'none' ? null : value)}
                placeholder="Sélectionner une catégorie"
              />
            </div>
          </div>
           <div className="space-y-2">
            <Label htmlFor="channel-name-format">Format du nom du salon</Label>
            <p className="text-sm text-muted-foreground/80">
              Variables: {'{user}'}, {'{id}'}, {'{random}'}, {'{champ1}'}, {'{champ2}'}, {'{champ3}'}.
            </p>
            <Input
              id="channel-name-format"
              value={config.channel_name_format || ''}
              onBlur={(e) => handleValueChange('channel_name_format', e.target.value)}
              placeholder="ticket-{user}-{random}"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="embed-message">Message du panneau de création</Label>
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
                <Label htmlFor="modal-title">Titre du formulaire de création (modal)</Label>
                <Input id="modal-title" value={config.modal_title || ''} onBlur={(e) => handleValueChange('modal_title', e.target.value)} placeholder="Ouvrir un ticket de support" />
           </div>
            <div className="space-y-4">
                 <Label className="font-bold">Champs du formulaire (Max 3)</Label>
                 {(config.custom_fields || []).map((field, index) => (
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
                        <div className="flex items-center gap-2 pt-2">
                           <Switch id={`required-${field.id}`} checked={field.required} onCheckedChange={(val) => handleCustomFieldChange(index, 'required', val)} />
                           <Label htmlFor={`required-${field.id}`}>Requis</Label>
                        </div>
                    </div>
                ))}
                <Button variant="outline" className="w-full" onClick={addCustomField} disabled={(config.custom_fields?.length || 0) >= 3}>
                    <PlusCircle className="mr-2" />
                    Ajouter un champ
                </Button>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Validation & Clôture</CardTitle>
            <CardDescription>Gérez le cycle de vie des tickets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
             <div className="flex items-center justify-between">
                <Label htmlFor="validation-enabled" className="font-bold">Valider les tickets avant ouverture</Label>
                <Switch id="validation-enabled" checked={config.validation_enabled} onCheckedChange={(val) => handleValueChange('validation_enabled', val)} />
            </div>
            {config.validation_enabled && (
                 <div className="space-y-2 pl-4 border-l-2">
                    <Label>Salon de validation</Label>
                    <Combobox options={channelOptions} value={config.validation_channel_id || 'none'} onChange={(v) => handleValueChange('validation_channel_id', v === 'none' ? null : v)} placeholder="Sélectionner un salon..."/>
                    <Label>Message de confirmation</Label>
                    <Input defaultValue={config.confirmation_message} onBlur={(e) => handleValueChange('confirmation_message', e.target.value)} placeholder="Votre demande a été envoyée pour validation."/>
                </div>
            )}
            <Separator/>
             <div className="flex items-center justify-between">
                <Label htmlFor="private-thread-enabled" className="font-bold">Activer le fil privé pour modérateurs</Label>
                <Switch id="private-thread-enabled" checked={config.private_thread_enabled} onCheckedChange={(val) => handleValueChange('private_thread_enabled', val)} />
            </div>
             {config.private_thread_enabled && (
                <div className="space-y-2 pl-4 border-l-2">
                    <Label>Format du nom du fil privé</Label>
                     <Input defaultValue={config.private_thread_name_format} onBlur={(e) => handleValueChange('private_thread_name_format', e.target.value)} placeholder="staff-{user}"/>
                </div>
            )}
            <Separator/>
             <div className="flex items-center justify-between">
                <Label htmlFor="auto-delete" className="font-bold">Suppression automatique après fermeture</Label>
                <Switch id="auto-delete" checked={config.auto_delete_on_close} onCheckedChange={(val) => handleValueChange('auto_delete_on_close', val)} />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="archive-summary" className="font-bold">Sauvegarder la conversation à la fermeture (IA)</Label>
                <Switch id="archive-summary" checked={config.archive_summary} onCheckedChange={(val) => handleValueChange('archive_summary', val)} />
            </div>
             {config.archive_summary && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                        Les transcriptions seront envoyées dans le salon de logs principal, ou dans le salon de logs de modération s'il est configuré.
                    </AlertDescription>
                </Alert>
             )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Commandes du Module</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {ticketCommands.map((command) => (
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
                        options={modRoleOptions}
                        value={config.command_permissions?.[command.key] || 'none'}
                        onChange={(value) => handlePermissionChange(command.key, value === 'none' ? null : value)}
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

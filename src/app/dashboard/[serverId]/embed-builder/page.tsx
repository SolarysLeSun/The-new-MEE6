
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eye, PencilRuler, Send, Sparkles, Loader2, Trash2, PlusCircle } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { DiscordEmbed, EmbedField } from '@/types';
import { Switch } from '@/components/ui/switch';
import { v4 as uuidv4 } from 'uuid';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}

const initialEmbed: DiscordEmbed = {
    title: "Titre de l'Embed",
    description: "Ceci est un exemple de description. Vous pouvez utiliser le **Markdown** de Discord.",
    color: 5793266,
    author: { name: '', url: '', icon_url: '' },
    image: { url: '' },
    thumbnail: { url: '' },
    footer: { text: "Pied de page", icon_url: '' },
    timestamp: false,
    fields: [
        { id: uuidv4(), name: 'Champ 1', value: 'Contenu du champ 1', inline: true },
        { id: uuidv4(), name: 'Champ 2', value: 'Contenu du champ 2', inline: true }
    ]
};

export default function EmbedBuilderPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [content, setContent] = useState('Bienvenue sur le serveur !');
    const [embeds, setEmbeds] = useState<DiscordEmbed[]>([initialEmbed]);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<string>('');
    const [webhookName, setWebhookName] = useState('');
    const [webhookAvatarUrl, setWebhookAvatarUrl] = useState('');
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await fetch(`${API_URL}/get-server-details/${serverId}`);
                if (!res.ok) throw new Error('Failed to fetch channels');
                const data = await res.json();
                const textChannels = data.channels.filter((c: DiscordChannel) => c.type === 0)
                setChannels(textChannels);
                if (textChannels.length > 0) {
                    setSelectedChannel(textChannels[0]?.id || '');
                }
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la liste des salons.", variant: "destructive" });
            } finally {
                setLoadingChannels(false);
            }
        };
        fetchChannels();
    }, [serverId, toast]);

    const handleEmbedChange = (index: number, field: keyof DiscordEmbed, value: any) => {
        const newEmbeds = [...embeds];
        newEmbeds[index] = { ...newEmbeds[index], [field]: value };
        setEmbeds(newEmbeds);
    };
    
    const handleNestedEmbedChange = (index: number, parentField: 'author' | 'footer' | 'image' | 'thumbnail', subField: string, value: string) => {
        const newEmbeds = [...embeds];
        const embedToUpdate = newEmbeds[index];
        (embedToUpdate[parentField] as any)[subField] = value;
        setEmbeds(newEmbeds);
    };

    const addField = (embedIndex: number) => {
        const newEmbeds = [...embeds];
        const newField: EmbedField = { id: uuidv4(), name: '', value: '', inline: false };
        newEmbeds[embedIndex].fields = [...(newEmbeds[embedIndex].fields || []), newField];
        setEmbeds(newEmbeds);
    };
    
    const updateField = (embedIndex: number, fieldId: string, field: keyof EmbedField, value: string | boolean) => {
        const newEmbeds = [...embeds];
        const fields = newEmbeds[embedIndex].fields || [];
        const fieldIndex = fields.findIndex(f => f.id === fieldId);
        if (fieldIndex > -1) {
            (fields[fieldIndex] as any)[field] = value;
            setEmbeds(newEmbeds);
        }
    };
    
    const removeField = (embedIndex: number, fieldId: string) => {
        const newEmbeds = [...embeds];
        newEmbeds[embedIndex].fields = (newEmbeds[embedIndex].fields || []).filter(f => f.id !== fieldId);
        setEmbeds(newEmbeds);
    };
    
    const handleSend = async () => {
        if (!selectedChannel) {
            toast({ title: "Aucun salon sélectionné", variant: "destructive" });
            return;
        }

        const finalEmbeds = embeds.map(embed => {
            const copy: any = { ...embed };
            // Convert color from hex to decimal
            if (typeof copy.color === 'string') {
                copy.color = parseInt(copy.color.replace('#', ''), 16);
            }
            // Add timestamp if enabled
            if (copy.timestamp) {
                copy.timestamp = new Date().toISOString();
            } else {
                delete copy.timestamp;
            }
            // Clean up empty objects
            if(!copy.author.name && !copy.author.url && !copy.author.icon_url) delete copy.author;
            if(!copy.footer.text && !copy.footer.icon_url) delete copy.footer;
            if(!copy.image.url) delete copy.image;
            if(!copy.thumbnail.url) delete copy.thumbnail;
            
            // Clean up field IDs
            if(copy.fields) {
                copy.fields = copy.fields.map(({ id, ...rest }: EmbedField) => rest);
            }

            return copy;
        });

        setIsSending(true);
        try {
            const response = await fetch(`${API_URL}/send-webhook-embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: selectedChannel,
                    embedData: { content, embeds: finalEmbeds },
                    webhookName: webhookName || undefined,
                    webhookAvatarUrl: webhookAvatarUrl || undefined,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Une erreur est survenue lors de l'envoi.");
            }
            toast({ title: "Succès", description: "Votre embed a été envoyé avec succès." });
        } catch (error: any) {
            toast({ title: "Erreur d'envoi", description: error.message, variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const channelOptions = channels.map(c => ({ value: c.id, label: `# ${c.name}` }));

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PencilRuler />
            Constructeur d'Embeds
        </h1>
        <p className="text-muted-foreground mt-2">
          Créez des messages Discord riches et personnalisés facilement.
        </p>
      </div>
      
      <Separator />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Contenu du Message</CardTitle></CardHeader>
                <CardContent>
                    <Textarea placeholder="Contenu textuel principal du message..." value={content} onChange={(e) => setContent(e.target.value)}/>
                </CardContent>
            </Card>

            {/* Embed Editor Form */}
             <Card>
                 <CardHeader><CardTitle>Éditeur d'Embed</CardTitle></CardHeader>
                 <CardContent>
                     <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
                         {embeds.map((embed, index) => (
                             <AccordionItem value={`item-${index}`} key={index}>
                                 <AccordionTrigger>Embed {index + 1}</AccordionTrigger>
                                 <AccordionContent className="space-y-4 pt-4">
                                     {/* Author */}
                                     <div className="space-y-2">
                                         <h4 className="font-semibold">Auteur</h4>
                                         <Input placeholder="Nom de l'auteur" value={embed.author.name} onChange={(e) => handleNestedEmbedChange(index, 'author', 'name', e.target.value)} />
                                         <div className="grid grid-cols-2 gap-2">
                                             <Input placeholder="URL de l'auteur" value={embed.author.url} onChange={(e) => handleNestedEmbedChange(index, 'author', 'url', e.target.value)} />
                                             <Input placeholder="URL de l'icône de l'auteur" value={embed.author.icon_url} onChange={(e) => handleNestedEmbedChange(index, 'author', 'icon_url', e.target.value)} />
                                         </div>
                                     </div>
                                     <Separator/>
                                     {/* Body */}
                                     <div className="space-y-2">
                                        <h4 className="font-semibold">Corps</h4>
                                        <Input placeholder="Titre" value={embed.title} onChange={(e) => handleEmbedChange(index, 'title', e.target.value)} maxLength={256}/>
                                        <Textarea placeholder="Description" value={embed.description} onChange={(e) => handleEmbedChange(index, 'description', e.target.value)} maxLength={4096} rows={5}/>
                                         <div className="grid grid-cols-2 gap-2 items-center">
                                            <Input placeholder="URL du titre" value={embed.url} onChange={(e) => handleEmbedChange(index, 'url', e.target.value)} />
                                            <div className="flex items-center gap-2">
                                               <Label>Couleur</Label>
                                               <Input type="color" value={typeof embed.color === 'number' ? `#${embed.color.toString(16).padStart(6, '0')}` : embed.color} onChange={(e) => handleEmbedChange(index, 'color', e.target.value)} className="p-1 h-8 w-12" />
                                            </div>
                                         </div>
                                     </div>
                                     <Separator/>
                                     {/* Images */}
                                     <div className="space-y-2">
                                         <h4 className="font-semibold">Images</h4>
                                         <Input placeholder="URL de l'image principale" value={embed.image.url} onChange={(e) => handleNestedEmbedChange(index, 'image', 'url', e.target.value)} />
                                         <Input placeholder="URL de la miniature" value={embed.thumbnail.url} onChange={(e) => handleNestedEmbedChange(index, 'thumbnail', 'url', e.target.value)} />
                                     </div>
                                      <Separator/>
                                     {/* Footer */}
                                     <div className="space-y-2">
                                         <h4 className="font-semibold">Pied de page</h4>
                                         <Input placeholder="Texte du pied de page" value={embed.footer.text} onChange={(e) => handleNestedEmbedChange(index, 'footer', 'text', e.target.value)} maxLength={2048}/>
                                         <Input placeholder="URL de l'icône du pied de page" value={embed.footer.icon_url} onChange={(e) => handleNestedEmbedChange(index, 'footer', 'icon_url', e.target.value)} />
                                         <div className="flex items-center gap-2 pt-2">
                                             <Switch id={`timestamp-${index}`} checked={!!embed.timestamp} onCheckedChange={(val) => handleEmbedChange(index, 'timestamp', val)}/>
                                             <Label htmlFor={`timestamp-${index}`}>Afficher l'horodatage</Label>
                                         </div>
                                     </div>
                                     <Separator/>
                                     {/* Fields */}
                                      <div className="space-y-2">
                                         <h4 className="font-semibold">Champs</h4>
                                         {(embed.fields || []).map((field) => (
                                             <div key={field.id} className="p-3 border rounded-md space-y-2">
                                                 <div className="flex justify-end"><Button variant="ghost" size="icon" onClick={() => removeField(index, field.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button></div>
                                                 <Input placeholder="Nom du champ" value={field.name} onChange={(e) => updateField(index, field.id, 'name', e.target.value)} maxLength={256}/>
                                                 <Textarea placeholder="Valeur du champ" value={field.value} onChange={(e) => updateField(index, field.id, 'value', e.target.value)} maxLength={1024}/>
                                                 <div className="flex items-center gap-2">
                                                     <Switch id={`inline-${field.id}`} checked={field.inline} onCheckedChange={(val) => updateField(index, field.id, 'inline', val)}/>
                                                     <Label htmlFor={`inline-${field.id}`}>Afficher en ligne</Label>
                                                 </div>
                                             </div>
                                         ))}
                                         <Button variant="outline" className="w-full" onClick={() => addField(index)} disabled={(embed.fields?.length || 0) >= 25}><PlusCircle/> Ajouter un champ</Button>
                                     </div>
                                 </AccordionContent>
                             </AccordionItem>
                         ))}
                     </Accordion>
                 </CardContent>
             </Card>
        </div>

         {/* Live Preview */}
        <div className="sticky top-24">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Eye/>Aperçu en Direct</CardTitle>
                </CardHeader>
                <CardContent className="bg-secondary/30 p-4 rounded-lg space-y-2 max-h-[70vh] overflow-y-auto">
                    {content && <p className="text-white whitespace-pre-wrap">{content}</p>}
                    {embeds.map((embed, i) => {
                        const colorHex = typeof embed.color === 'number' ? `#${embed.color.toString(16).padStart(6, '0')}` : embed.color;
                        return (
                            <div key={i} className="bg-[#2B2D31] p-4 rounded border-l-4" style={{ borderColor: colorHex }}>
                                {embed.author?.name && <p className="text-sm font-semibold flex items-center gap-2 mb-2"><img src={embed.author.icon_url || undefined} className="w-6 h-6 rounded-full" /> {embed.author.name}</p>}
                                {embed.title && <h3 className="font-bold text-white">{embed.title}</h3>}
                                {embed.description && <p className="text-sm text-gray-300 whitespace-pre-wrap">{embed.description}</p>}
                                {embed.fields && embed.fields.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                        {embed.fields.map((field) => (
                                            <div key={field.id} className={field.inline ? 'col-span-1' : 'col-span-1 md:col-span-3'}>
                                                <h4 className="font-semibold text-sm text-gray-200">{field.name}</h4>
                                                <p className="text-sm text-gray-400 whitespace-pre-wrap">{field.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {embed.image?.url && <img src={embed.image.url} className="mt-2 rounded-lg max-w-full h-auto" />}
                                {embed.thumbnail?.url && <img src={embed.thumbnail.url} className="mt-2 rounded-lg w-20 h-20 float-right" />}
                                <div className="clear-both"></div>
                                {embed.footer?.text && (
                                     <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
                                        {embed.footer.icon_url && <img src={embed.footer.icon_url} className="w-5 h-5 rounded-full"/>}
                                        <span>{embed.footer.text} {embed.timestamp && `• Aujourd'hui à ${new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}`}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
      </div>
       <Card>
            <CardHeader>
                <CardTitle>Destination & Identité</CardTitle>
                <CardDescription>Choisissez où et comment envoyer votre embed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 lg:col-span-1">
                        <Label>Salon d'envoi</Label>
                        {loadingChannels ? <Skeleton className="h-10 w-full" /> : (
                            <Combobox
                                options={channelOptions}
                                value={selectedChannel}
                                onChange={setSelectedChannel}
                                placeholder="Sélectionner un salon..."
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Nom du Webhook (Optionnel)</Label>
                        <Input placeholder="Nom personnalisé" value={webhookName} onChange={(e) => setWebhookName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Avatar du Webhook (Optionnel)</Label>
                        <Input placeholder="URL de l'image" value={webhookAvatarUrl} onChange={(e) => setWebhookAvatarUrl(e.target.value)} />
                    </div>
                </div>
                 <div className="flex justify-end pt-4">
                    <Button size="lg" onClick={handleSend} disabled={isSending || !selectedChannel}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                        Envoyer l'Embed
                    </Button>
                </div>
            </CardContent>
       </Card>
    </PageTransitionWrapper>
  );
}

// Ensure uuidv4 is available on window for client-side usage
if (typeof window !== 'undefined' && !(window as any).uuidv4) {
    (window as any).uuidv4 = uuidv4;
}

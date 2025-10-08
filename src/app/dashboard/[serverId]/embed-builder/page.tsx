
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eye, PencilRuler, Send, Sparkles, Loader2 } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001/api';

const exampleJson = `{
  "content": "Bienvenue sur le serveur !",
  "embeds": [
    {
      "title": "Titre de l'Embed",
      "description": "Ceci est un exemple de description. Vous pouvez utiliser le **Markdown** de Discord.",
      "color": 5793266,
      "fields": [
        {
          "name": "Champ 1",
          "value": "Contenu du champ 1",
          "inline": true
        },
        {
          "name": "Champ 2",
          "value": "Contenu du champ 2",
          "inline": true
        }
      ],
      "footer": {
        "text": "Pied de page de l'embed"
      }
    }
  ]
}`;

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}

function AiJsonFixerDialog({ currentJson, onApply }: { currentJson: string, onApply: (newJson: string) => void }) {
    const [request, setRequest] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/fix-embed-json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ json: currentJson, request }),
            });
            if (!response.ok) throw new Error('La génération a échoué');
            const result = await response.json();
            onApply(result.fixedJson);
        } catch (error) {
            toast({ title: "Erreur IA", description: "Impossible de corriger le JSON.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Modifier ou corriger avec l'IA
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assistant Embed IA</DialogTitle>
                    <DialogDescription>
                        Décrivez les changements que vous voulez apporter à votre embed, ou demandez à l'IA de le corriger.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="ia-request">Votre demande</Label>
                    <Input id="ia-request" value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Ex: Ajoute un champ 'Règles'" />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Appliquer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function EmbedBuilderPage() {
    const params = useParams();
    const serverId = params.serverId as string;
    const { toast } = useToast();

    const [jsonContent, setJsonContent] = useState(exampleJson);
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
                setChannels(data.channels.filter((c: DiscordChannel) => c.type === 0));
                if (data.channels.length > 0) {
                    setSelectedChannel(data.channels.filter((c: DiscordChannel) => c.type === 0)[0]?.id || '');
                }
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de charger la liste des salons.", variant: "destructive" });
            } finally {
                setLoadingChannels(false);
            }
        };
        fetchChannels();
    }, [serverId, toast]);

    const handleSend = async () => {
        if (!selectedChannel) {
            toast({ title: "Aucun salon sélectionné", variant: "destructive" });
            return;
        }
        let parsedJson;
        try {
            parsedJson = JSON.parse(jsonContent);
        } catch (error) {
            toast({ title: "JSON Invalide", description: "Veuillez vérifier la syntaxe de votre JSON.", variant: "destructive" });
            return;
        }

        setIsSending(true);
        try {
            const response = await fetch(`${API_URL}/send-webhook-embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: selectedChannel,
                    embedData: parsedJson,
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

    let embedPreview = null;
    try {
        const parsed = JSON.parse(jsonContent);
        const embedData = parsed.embeds?.[0];
        if (embedData) {
            embedPreview = (
                <div className="bg-[#2B2D31] p-4 rounded border-l-4" style={{ borderColor: embedData.color ? `#${embedData.color.toString(16).padStart(6, '0')}` : '#5865F2' }}>
                    {embedData.author && <p className="text-sm font-semibold flex items-center gap-2"><img src={embedData.author.icon_url} className="w-6 h-6 rounded-full" /> {embedData.author.name}</p>}
                    {embedData.title && <h3 className="font-bold text-white">{embedData.title}</h3>}
                    {embedData.description && <p className="text-sm text-gray-300 whitespace-pre-wrap">{embedData.description}</p>}
                    {embedData.fields && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {embedData.fields.map((field: any, index: number) => (
                                <div key={index} className={field.inline ? '' : 'col-span-2'}>
                                    <h4 className="font-semibold text-sm text-gray-200">{field.name}</h4>
                                    <p className="text-sm text-gray-400 whitespace-pre-wrap">{field.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {embedData.image && <img src={embedData.image.url} className="mt-2 rounded-lg max-w-full h-auto" />}
                    {embedData.thumbnail && <img src={embedData.thumbnail.url} className="mt-2 rounded-lg w-20 h-20 float-right" />}
                    {embedData.footer && <p className="text-xs text-gray-500 mt-4">{embedData.footer.text}</p>}
                </div>
            );
        }
    } catch (e) {
        // Invalid JSON, preview won't render
    }

  return (
    <PageTransitionWrapper className="space-y-8 text-white max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PencilRuler />
            Constructeur d'Embeds
        </h1>
        <p className="text-muted-foreground mt-2">
          Créez des messages Discord riches et personnalisés facilement, avec l'aide de l'IA.
        </p>
      </div>
      
      <Separator />

      <div className="space-y-6">
           <div className="grid md:grid-cols-2 gap-6">
                {/* JSON Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Éditeur JSON de l'Embed</CardTitle>
                        <CardDescription>Modifiez directement le code JSON de l'embed ci-dessous.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            value={jsonContent}
                            onChange={(e) => setJsonContent(e.target.value)}
                            rows={20}
                            className="font-mono text-xs bg-black/30"
                        />
                         <AiJsonFixerDialog currentJson={jsonContent} onApply={setJsonContent} />
                    </CardContent>
                </Card>
                 {/* Live Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Eye/>Aperçu en Direct</CardTitle>
                        <CardDescription>L'embed apparaîtra ici tel qu'il sera sur Discord.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-secondary p-4 rounded-lg space-y-2">
                            {JSON.parse(jsonContent).content && <p className="text-white">{JSON.parse(jsonContent).content}</p>}
                            {embedPreview || <p className="text-destructive text-center py-8">JSON de l'embed invalide ou manquant.</p>}
                        </div>
                    </CardContent>
                </Card>
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
      </div>

    </PageTransitionWrapper>
  );
}



'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, UploadCloud, Reply, Paperclip } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Transcript {
    server: { name: string; iconURL: string | null };
    channel: { name: string; topic: string | null };
    generatedAt: string;
    messageCount: number;
    messages: TranscriptMessage[];
}

interface TranscriptMessage {
    id: string;
    content: string;
    author: {
        id: string;
        username: string;
        displayName: string;
        avatarURL: string | null;
        isBot: boolean;
        roleColor: string;
    };
    timestamp: string;
    embeds: any[];
    attachments: any[];
    replyTo: string | null;
}

const renderContent = (content: string) => {
    const mentionRegex = /<(@[!&]?|#)(\d+)>/g;
    return content.replace(mentionRegex, (match) => {
        return `<span class="bg-primary/20 text-primary/90 px-1 rounded-sm">${match}</span>`;
    });
};

const MessageItem: React.FC<{ message: TranscriptMessage, getMessageById: (id: string) => TranscriptMessage | undefined }> = ({ message, getMessageById }) => {
    const repliedMessage = message.replyTo ? getMessageById(message.replyTo) : null;
    return (
        <div className="flex gap-4 p-2 hover:bg-white/5 rounded-md">
            <Avatar className="mt-1">
                <AvatarImage src={message.author.avatarURL || undefined} />
                <AvatarFallback>{message.author.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold" style={{ color: message.author.roleColor }}>{message.author.displayName}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(message.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                </div>
                 {repliedMessage && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-1 my-1 border-l-2 border-primary/50">
                        <Reply className="w-3 h-3"/>
                        <Avatar className="w-4 h-4"><AvatarImage src={repliedMessage.author.avatarURL || undefined} /></Avatar>
                        <span style={{color: repliedMessage.author.roleColor}}>{repliedMessage.author.displayName}</span>
                        <p className="truncate">{repliedMessage.content}</p>
                    </div>
                )}
                <div className="text-white whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}></div>
                 {message.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 text-blue-400 hover:underline">
                        <Paperclip className="w-4 h-4"/> {att.name}
                    </a>
                 ))}
                 {message.embeds.map((embed, i) => (
                    <div key={i} className="mt-2 bg-[#2B2D31] p-3 rounded-lg border-l-4" style={{ borderColor: embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865F2' }}>
                        {embed.author && <p className="text-sm font-semibold flex items-center gap-2 mb-1"><img src={embed.author.icon_url} className="w-5 h-5 rounded-full" /> {embed.author.name}</p>}
                        {embed.title && <h3 className="font-bold text-white text-base">{embed.title}</h3>}
                        {embed.description && <p className="text-sm text-gray-300 whitespace-pre-wrap">{embed.description}</p>}
                        {embed.fields && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                {embed.fields.map((field: any, index: number) => (
                                    <div key={index} className={field.inline ? '' : 'col-span-1 md:col-span-2'}>
                                        <h4 className="font-semibold text-sm text-gray-200">{field.name}</h4>
                                        <p className="text-sm text-gray-400 whitespace-pre-wrap">{field.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {embed.image && <img src={embed.image.url} className="mt-2 rounded-lg max-w-sm h-auto" />}
                        {embed.footer && <p className="text-xs text-gray-500 mt-3">{embed.footer.text}</p>}
                    </div>
                 ))}
            </div>
        </div>
    );
};


export default function TranscriptViewerPage() {
    const [transcript, setTranscript] = useState<Transcript | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);

    const handleFile = (file: File) => {
        if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target?.result as string);
                    setTranscript(parsed);
                    setFileName(file.name);
                } catch(e) {
                    console.error("Invalid JSON file");
                }
            };
            reader.readAsText(file);
        } else {
            console.error("Invalid file type. Please upload a .json file.");
        }
    };
    
    const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragActive(false);
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            handleFile(event.dataTransfer.files[0]);
        }
    }, []);

    const handleDrag = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === "dragenter" || event.type === "dragover") {
            setIsDragActive(true);
        } else if (event.type === "dragleave") {
            setIsDragActive(false);
        }
    }, []);

    const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            handleFile(event.target.files[0]);
        }
    };
    
    const getMessageById = (id: string) => transcript?.messages.find(m => m.id === id);


    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Lecteur de Transcriptions</h1>
                <p className="text-muted-foreground mt-2">
                    Visualisez les conversations sauvegardées en déposant le fichier JSON généré par la commande `/save`.
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Visualiseur de Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                    {!transcript ? (
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={onDrop}
                            onClick={() => document.getElementById('file-input')?.click()}
                            className={cn(
                                "flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            )}
                        >
                            <input
                                id="file-input"
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleFileInput}
                            />
                            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                            {isDragActive ? (
                                <p className="text-lg font-semibold">Déposez le fichier ici...</p>
                            ) : (
                                <>
                                    <p className="text-lg font-semibold">Glissez-déposez un fichier de transcription</p>
                                    <p className="text-muted-foreground">ou cliquez pour sélectionner un fichier (.json)</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Card className="bg-card/50">
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={transcript.server.iconURL || undefined}/>
                                            <AvatarFallback>{transcript.server.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle>{transcript.server.name}</CardTitle>
                                            <CardDescription># {transcript.channel.name}</CardDescription>
                                        </div>
                                    </div>
                                    
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <p>Transcription de <span className="font-bold text-white">{transcript.messageCount}</span> messages générée le {format(new Date(transcript.generatedAt), 'dd/MM/yyyy \'à\' HH:mm', { locale: fr })}.</p>
                                    {transcript.channel.topic && <p className="mt-2 italic">Sujet du salon : {transcript.channel.topic}</p>}
                                </CardContent>
                            </Card>
                            <div className="border rounded-lg p-4 h-[60vh] overflow-y-auto space-y-4">
                                {transcript.messages.map(message => (
                                    <MessageItem key={message.id} message={message} getMessageById={getMessageById} />
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}

    
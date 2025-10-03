
'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, UploadCloud } from 'lucide-react';
import { PageTransitionWrapper } from '@/components/page-transition-wrapper';
import { cn } from '@/lib/utils';

export default function TranscriptViewerPage() {
    const [transcriptHtml, setTranscriptHtml] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file && file.type === 'text/html') {
            const reader = new FileReader();
            reader.onload = (event) => {
                setTranscriptHtml(event.target?.result as string);
                setFileName(file.name);
            };
            reader.readAsText(file);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/html': ['.html'] },
        maxFiles: 1,
    });

    return (
        <PageTransitionWrapper className="space-y-8 text-white max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Lecteur de Transcriptions</h1>
                <p className="text-muted-foreground mt-2">
                    Visualisez les conversations sauvegardées en déposant le fichier HTML ici.
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Visualiseur</CardTitle>
                </CardHeader>
                <CardContent>
                    {!transcriptHtml ? (
                        <div
                            {...getRootProps()}
                            className={cn(
                                "flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            )}
                        >
                            <input {...getInputProps()} />
                            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                            {isDragActive ? (
                                <p className="text-lg font-semibold">Déposez le fichier ici...</p>
                            ) : (
                                <>
                                    <p className="text-lg font-semibold">Glissez-déposez un fichier de transcription</p>
                                    <p className="text-muted-foreground">ou cliquez pour sélectionner un fichier (.html)</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FileText className="w-4 h-4"/>
                                <span>{fileName}</span>
                            </div>
                            <div className="border rounded-lg overflow-hidden h-[60vh]">
                                <iframe
                                    srcDoc={transcriptHtml}
                                    title="Transcription Viewer"
                                    className="w-full h-full bg-background"
                                    sandbox="" // Sandboxing for security
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageTransitionWrapper>
    );
}

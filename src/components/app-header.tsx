'use client';
import { Bot } from 'lucide-react';
import Link from 'next/link';

function MarcusLogo() {
  return (
    <div className="p-2 bg-primary/10 rounded-md">
        <Bot className="text-primary"/>
    </div>
  );
}


export function AppHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20">
        <div className="container mx-auto px-4">
            <div className="flex h-20 items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                    <MarcusLogo />
                    <h1 className="text-xl font-bold text-white tracking-tighter">Marcus</h1>
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
                    <a href="#features" className="transition-colors hover:text-white">
                    Fonctionnalités
                    </a>
                    <a href="https://discord.gg/WSpz7FqFsC" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                    Support
                    </a>
                </nav>
            </div>
        </div>
    </header>
  );
}

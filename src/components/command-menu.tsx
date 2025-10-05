

'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from './ui/button';
import { Search } from 'lucide-react';
import { navCategories } from './module-sidebar';

export function CommandMenu() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.serverId as string;
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
       <Button
        variant="outline"
        className="h-9 w-9 p-0 md:w-40 md:justify-start md:px-3"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline-block">Recherche...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher une fonctionnalité ou un module..." />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          {serverId && navCategories.map((category) => (
            <CommandGroup key={category.name} heading={category.name}>
              {category.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                  onSelect={() => {
                    runCommand(() => router.push(`/dashboard/${serverId}/${item.href}`));
                  }}
                  disabled={item.isDisabled}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

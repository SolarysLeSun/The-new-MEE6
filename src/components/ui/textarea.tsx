
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => {
  const localRef = React.useRef<HTMLTextAreaElement>(null);
  const combinedRef = (el: HTMLTextAreaElement) => {
    localRef.current = el;
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.target;
    textarea.style.height = 'auto'; // Réinitialiser la hauteur
    textarea.style.height = `${textarea.scrollHeight}px`; // Ajuster à la hauteur du contenu
    if (props.onChange) {
        props.onChange(event);
    }
  };
  
   React.useEffect(() => {
    if (localRef.current) {
      localRef.current.style.height = 'auto';
      localRef.current.style.height = `${localRef.current.scrollHeight}px`;
    }
  }, []);

  return (
    <textarea
      className={cn(
        'flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm overflow-hidden resize-none min-h-[80px]',
        className
      )}
      ref={combinedRef}
      onInput={handleInput}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };

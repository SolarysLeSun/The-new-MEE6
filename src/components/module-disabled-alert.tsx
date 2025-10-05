
'use client';

import { AlertTriangle, Power } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ModuleDisabledAlertProps {
  reason: string | null;
}

export function ModuleDisabledAlert({ reason }: ModuleDisabledAlertProps) {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Module en Arrêt d'Urgence</AlertTitle>
      <AlertDescription>
        Un administrateur a désactivé ce module en urgence. Raison : "{reason || 'Aucune raison spécifiée'}".
        Toutes les configurations sont en lecture seule.
      </AlertDescription>
    </Alert>
  );
}

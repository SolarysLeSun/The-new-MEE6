
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BookCopy, Bot, Brush, Code, Eye, Hash, PlusCircle, Save, Sparkles, Trash2, type LucideIcon } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const componentTools = [
  { id: 'switch', name: 'Interrupteur', icon: Switch, defaultProps: { label: 'Nouvel Interrupteur', description: 'Active ou désactive une option.' } },
  { id: 'text_input', name: 'Champ de Texte', icon: Input, defaultProps: { label: 'Nouveau Champ', placeholder: 'Entrez du texte...' } },
  { id: 'textarea', name: 'Zone de Texte', icon: Textarea, defaultProps: { label: 'Nouvelle Zone', placeholder: 'Entrez un texte plus long...' } },
  { id: 'channel_select', name: 'Sélecteur de Salon', icon: Hash, defaultProps: { label: 'Sélecteur de Salon' } },
  { id: 'role_select', name: 'Sélecteur de Rôle', icon: () => '@', defaultProps: { label: 'Sélecteur de Rôle' } },
];

function SortableComponent({ id, component, onRemove, children }: { id: string, component: any, onRemove: (id: string) => void, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative p-4 border rounded-lg bg-card-foreground/5">
      {children}
      <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => onRemove(id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
    </div>
  );
}

export default function ModuleEditorPage() {
  const [moduleName, setModuleName] = useState('');
  const [moduleIcon, setModuleIcon] = useState('BookCopy');
  const [components, setComponents] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addComponent = (type: string) => {
    const tool = componentTools.find(t => t.id === type);
    if (tool) {
      const newComponent = {
        id: `${type}-${Date.now()}`,
        type,
        props: { ...tool.defaultProps, variableName: `var_${type}_${components.length}` },
      };
      setComponents(prev => [...prev, newComponent]);
    }
  };
  
  const removeComponent = (id: string) => {
      setComponents(prev => prev.filter(c => c.id !== id));
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setComponents((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const renderComponentPreview = (component: any) => {
    switch (component.type) {
      case 'switch':
        return (
          <div className="flex items-center justify-between">
            <div>
              <Label>{component.props.label}</Label>
              {component.props.description && <p className="text-sm text-muted-foreground">{component.props.description}</p>}
            </div>
            <Switch />
          </div>
        );
      case 'text_input':
        return (
          <div className="space-y-2">
            <Label>{component.props.label}</Label>
            <Input placeholder={component.props.placeholder} />
          </div>
        );
      case 'textarea':
        return (
          <div className="space-y-2">
            <Label>{component.props.label}</Label>
            <Textarea placeholder={component.props.placeholder} />
          </div>
        );
       case 'channel_select':
            return (
                <div className="space-y-2">
                    <Label>{component.props.label}</Label>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un salon..."/></SelectTrigger>
                    </Select>
                </div>
            );
        case 'role_select':
             return (
                <div className="space-y-2">
                    <Label>{component.props.label}</Label>
                    <Select>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un rôle..."/></SelectTrigger>
                    </Select>
                </div>
            );
      default:
        return null;
    }
  };


  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Éditeur de Module</h1>
        <p className="text-muted-foreground mt-2">Créez votre propre module personnalisable pour Marcus.</p>
      </div>

      <Separator />

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* --- Colonne de Gauche: Configuration & Outils --- */}
        <div className="lg:col-span-1 space-y-6 sticky top-8">
            <Card>
                <CardHeader>
                    <CardTitle>Métadonnées du Module</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="module-name">Nom du Module</Label>
                        <Input id="module-name" value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="Ex: Anti-Spam Avancé"/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="module-id">ID du Module</Label>
                        <Input id="module-id" value={moduleName.toLowerCase().replace(/\s+/g, '-')} disabled/>
                    </div>
                    <div className="space-y-2">
                         <Label>Icône</Label>
                         {/* TODO: Remplacer par un vrai sélecteur d'icônes */}
                        <Select value={moduleIcon} onValueChange={setModuleIcon}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BookCopy">Livre</SelectItem>
                                <SelectItem value="Sparkles">Étincelles</SelectItem>
                                <SelectItem value="Bot">Bot</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Boîte à Outils</CardTitle>
                    <CardDescription>Ajoutez des composants au panel de votre module.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    {componentTools.map(tool => (
                        <Button key={tool.id} variant="outline" onClick={() => addComponent(tool.id)}>
                            <tool.icon className="mr-2" />
                            {tool.name}
                        </Button>
                    ))}
                </CardContent>
            </Card>
        </div>
        
        {/* --- Colonne de Droite: Prévisualisation & Actions --- */}
        <div className="lg:col-span-2 space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                         <CardTitle className="flex items-center gap-2"><Eye/>Éditeur</CardTitle>
                         <Button disabled><Save className="mr-2"/>Sauvegarder le Module</Button>
                    </div>
                    <CardDescription>Construisez l'interface et la logique de votre module ici.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="panel">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="panel">Interface du Panel</TabsTrigger>
                            <TabsTrigger value="bot">Logique du Bot</TabsTrigger>
                        </TabsList>
                        <TabsContent value="panel" className="min-h-[500px] p-6 border-dashed border-2 rounded-b-lg border-t-0 space-y-4">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={components.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    {components.map(component => (
                                        <SortableComponent key={component.id} id={component.id} component={component} onRemove={removeComponent}>
                                            {renderComponentPreview(component)}
                                        </SortableComponent>
                                    ))}
                                </SortableContext>
                            </DndContext>
                            {components.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-16">
                                    <Brush className="w-12 h-12 mb-4"/>
                                    <p>Commencez à construire votre interface en ajoutant des composants depuis la boîte à outils.</p>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="bot" className="min-h-[500px] p-6 border-dashed border-2 rounded-b-lg border-t-0 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="ai-prompt" className="text-lg font-semibold">Assistant de code IA</Label>
                                <p className="text-sm text-muted-foreground">Décrivez la fonctionnalité de votre module (commande, événement, etc.). L'IA générera le code nécessaire. Soyez aussi descriptif que possible.</p>
                                <Textarea 
                                    id="ai-prompt" 
                                    rows={5}
                                    placeholder="Ex: 'Crée une commande /profil qui montre l'avatar, le nom, l'ID et la date d'arrivée de l'utilisateur mentionné dans un embed. La commande ne doit être utilisable que par les modérateurs, en utilisant la variable de configuration 'moderator_role_id' que j'ai créée dans l'interface.'" 
                                />
                                <Button className="w-full" disabled>
                                    <Sparkles className="mr-2"/>
                                    Générer le code (Bientôt)
                                </Button>
                            </div>
                            <Separator/>
                             <div className="space-y-2">
                                <Label className="text-lg font-semibold">Code Généré</Label>
                                <Textarea 
                                    readOnly 
                                    className="font-mono text-xs bg-muted/50" 
                                    rows={15} 
                                    placeholder="// Le code de votre commande ou événement apparaîtra ici..."
                                />
                             </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

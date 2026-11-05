import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CategoriesTab } from './categories-tab';
import { PluggyTab } from './pluggy-tab';
import { RulesTab } from './rules-tab';

export function Component() {
  return (
    <Tabs defaultValue="categories">
      <TabsList aria-label="Seções de categorias e regras">
        <TabsTrigger value="categories">Categorias</TabsTrigger>
        <TabsTrigger value="rules">Regras</TabsTrigger>
        <TabsTrigger value="pluggy">Pluggy</TabsTrigger>
      </TabsList>
      <TabsContent value="categories">
        <CategoriesTab />
      </TabsContent>
      <TabsContent value="rules">
        <RulesTab />
      </TabsContent>
      <TabsContent value="pluggy">
        <PluggyTab />
      </TabsContent>
    </Tabs>
  );
}

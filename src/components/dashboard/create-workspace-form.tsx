
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { IngestionState, WorkspaceStatus } from '@/lib/firestore-types';


const sectorEnum = z.enum([
  'Agricultura',
  'Alimentação',
  'Construção',
  'Contabilidade',
  'Consultoria',
  'Educação',
  'Engenharia',
  'Financeiro',
  'Imobiliário',
  'Jurídico',
  'Marketing e Publicidade',
  'Mídia e Entretenimento',
  'Saúde',
  'Serviços',
  'Tecnologia',
  'Transporte e Logística',
  'Turismo e Hotelaria',
  'Varejo',
  'Outro',
]);

const formSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  type: z.enum(['empresa', 'grupo', 'franquia', 'rede', 'loja', 'clínica', 'escritório', 'outro']),
  sector: sectorEnum,
});

type FormValues = z.infer<typeof formSchema>;

export function CreateWorkspaceForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'empresa',
    },
  });

  async function onSubmit(values: FormValues) {
    if (!user || !firestore) return;

    try {
      const docRef = await addDoc(collection(firestore, 'workspaces'), {
        ...values,
        name_lowercase: values.name.toLowerCase(),
        ownerId: user.uid,
        members: [user.uid],
        roles: {
          [user.uid]: 'admin',
        },
        status: WorkspaceStatus.NEVER_PUBLISHED,
        ingestionState: IngestionState.IDLE,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Workspace criado!',
        description: 'Você já pode começar a organizar seu conhecimento.',
      });
      router.push(`/dashboard/${docRef.id}`);
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Algo deu errado.',
        description: 'Não foi possível criar o workspace. Tente novamente.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Workspace</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Minha Franquia de Açaí" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de negócio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="grupo">Grupo</SelectItem>
                  <SelectItem value="franquia">Franquia</SelectItem>
                  <SelectItem value="rede">Rede</SelectItem>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="clínica">Clínica</SelectItem>
                  <SelectItem value="escritório">Escritório</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sector"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setor</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor de atuação" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sectorEnum.options.map((sector) => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Criando...' : 'Criar workspace'}
        </Button>
      </form>
    </Form>
  );
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  BookOpen,
  Layers,
  Users,
  Sparkles,
  Building2,
  Target,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Workspace,
  User,
  PublishedKnowledge,
  Playbook,
  TrainingModule,
} from '@/lib/firestore-types';
import { completeOnboarding } from '@/lib/actions/workspace-actions';

const TOTAL_STEPS = 7;

// ─── Step Indicators ──────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i < current ? 'bg-primary w-6' : i === current ? 'bg-primary w-8' : 'bg-muted w-4'
          )}
        />
      ))}
    </div>
  );
}

// ─── Step: Boas-vindas ────────────────────────────────────────────────────────
function StepWelcome({ workspace, userProfile }: { workspace: Workspace | null; userProfile: User | null }) {
  const firstName = userProfile?.name?.split(' ')[0] || 'você';
  const welcomeMsg =
    workspace?.onboarding?.welcomeMessage ||
    `Estamos muito felizes em ter você aqui. Nos próximos minutos, vamos te apresentar tudo que você precisa saber para começar com o pé direito.`;

  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
      {workspace?.logoUrl && (
        <div className="relative w-24 h-24">
          <Image src={workspace.logoUrl} alt={workspace.name} fill className="object-contain" />
        </div>
      )}
      {!workspace?.logoUrl && (
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-12 w-12 text-primary" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
          Bem-vindo(a) a
        </p>
        <h1 className="text-4xl font-bold tracking-tight">{workspace?.name || 'Sua nova empresa'}</h1>
      </div>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Olá, <span className="font-semibold text-foreground">{firstName}</span>! {welcomeMsg}
      </p>
    </div>
  );
}

// ─── Step: Sobre a empresa ────────────────────────────────────────────────────
function StepAboutCompany({ workspace }: { workspace: Workspace | null }) {
  const hasMission = !!workspace?.onboarding?.missionStatement;
  const hasValues = workspace?.onboarding?.values && workspace.onboarding.values.length > 0;

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto w-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Sobre a empresa</h2>
        <p className="text-muted-foreground mt-2">Conheça quem você está representando.</p>
      </div>

      <div className="grid gap-4">
        <div className="flex items-start gap-4 p-4 rounded-xl border bg-card">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tipo e Setor</p>
            <p className="font-semibold capitalize">{workspace?.type || '—'}</p>
            <p className="text-muted-foreground text-sm">{workspace?.sector || '—'}</p>
          </div>
        </div>

        {hasMission && (
          <div className="flex items-start gap-4 p-4 rounded-xl border bg-card">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Missão</p>
              <p className="text-foreground leading-relaxed">{workspace?.onboarding?.missionStatement}</p>
            </div>
          </div>
        )}

        {hasValues && (
          <div className="flex items-start gap-4 p-4 rounded-xl border bg-card">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Valores</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {workspace?.onboarding?.values?.map((v) => (
                  <Badge key={v} variant="secondary" className="text-sm">{v}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {!hasMission && !hasValues && (
          <div className="p-4 rounded-xl border bg-card text-center text-muted-foreground text-sm">
            Informações institucionais serão adicionadas pelo seu gestor em breve.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step: Perfil do colaborador ──────────────────────────────────────────────
function StepCollaboratorProfile({
  profileData,
  onChange,
}: {
  profileData: { role: string; sector: string };
  onChange: (data: { role: string; sector: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto w-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Seu perfil</h2>
        <p className="text-muted-foreground mt-2">Nos conte um pouco sobre você para personalizar sua experiência.</p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm font-semibold">Qual é o seu cargo?</Label>
          <Input
            id="role"
            placeholder="Ex: Analista de Marketing, Gerente de Vendas..."
            value={profileData.role}
            onChange={(e) => onChange({ ...profileData, role: e.target.value })}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sector" className="text-sm font-semibold">Em qual setor/área você atua?</Label>
          <Input
            id="sector"
            placeholder="Ex: Comercial, Operações, Atendimento..."
            value={profileData.sector}
            onChange={(e) => onChange({ ...profileData, sector: e.target.value })}
            className="h-12 text-base"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Essas informações são opcionais e podem ser atualizadas no seu perfil.
        </p>
      </div>
    </div>
  );
}

// ─── Step: Base de Conhecimento ───────────────────────────────────────────────
function StepKnowledgeBase({ knowledge }: { knowledge: PublishedKnowledge | null }) {
  const categories = knowledge?.categories?.slice(0, 6) || [];

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto w-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Base de conhecimento</h2>
        <p className="text-muted-foreground mt-2">
          Todo o conhecimento da empresa está organizado e disponível para você.
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat.categoria} className="flex items-center gap-3 p-4 rounded-xl border bg-card">
              <span className="text-2xl">{cat.icone}</span>
              <div>
                <p className="font-semibold text-sm">{cat.categoria}</p>
                <p className="text-xs text-muted-foreground">{cat.itens.length} documento(s)</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-xl">
          A base de conhecimento está sendo preparada pelo seu gestor.
        </div>
      )}

      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground">
          Você também terá acesso a um <span className="font-semibold text-foreground">assistente de IA</span> para tirar dúvidas sobre qualquer conteúdo da empresa.
        </p>
      </div>
    </div>
  );
}

// ─── Step: Processos principais ───────────────────────────────────────────────
function StepKeyProcesses({ playbooks }: { playbooks: Playbook[] | null }) {
  const displayPlaybooks = playbooks?.slice(0, 3) || [];

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto w-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Processos principais</h2>
        <p className="text-muted-foreground mt-2">
          A empresa tem processos bem definidos para garantir consistência e qualidade.
        </p>
      </div>

      {displayPlaybooks.length > 0 ? (
        <div className="flex flex-col gap-4">
          {displayPlaybooks.map((pb, idx) => (
            <div key={pb.id} className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  {idx + 1}
                </div>
                <h3 className="font-semibold">{pb.processo}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {pb.passos.slice(0, 3).map((step) => (
                  <Badge key={step.numero} variant="secondary" className="text-xs">
                    {step.numero}. {step.titulo}
                  </Badge>
                ))}
                {pb.passos.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{pb.passos.length - 3} passos
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-xl">
          Os playbooks operacionais serão disponibilizados em breve.
        </div>
      )}
    </div>
  );
}

// ─── Step: Jornada de aprendizado ─────────────────────────────────────────────
function StepLearningPath({ modules }: { modules: TrainingModule[] | null }) {
  const displayModules = modules?.filter((m) => m.status === 'published').slice(0, 5) || [];

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto w-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Sua jornada de aprendizado</h2>
        <p className="text-muted-foreground mt-2">
          Você terá acesso a treinamentos estruturados para dominar cada aspecto do trabalho.
        </p>
      </div>

      {displayModules.length > 0 ? (
        <div className="flex flex-col gap-3">
          {displayModules.map((mod, idx) => (
            <div key={mod.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground text-sm">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{mod.titulo}</p>
                <p className="text-xs text-muted-foreground capitalize">{mod.formato} · {mod.duracao}</p>
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-xl">
          Os módulos de treinamento estão sendo preparados pelo seu gestor.
        </div>
      )}
    </div>
  );
}

// ─── Step: Assistente IA ──────────────────────────────────────────────────────
function StepAssistant({ workspace }: { workspace: Workspace | null }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h2 className="text-3xl font-bold">Seu assistente de IA</h2>
        <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
          Qualquer dúvida sobre processos, produtos ou a operação de{' '}
          <span className="font-semibold text-foreground">{workspace?.name}</span>? Basta perguntar ao assistente.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {[
          'Como funciona o processo de atendimento ao cliente?',
          'Quais são as políticas de desconto?',
          'Onde encontro o manual de produto X?',
          'Qual o procedimento em caso de reclamação?',
        ].map((example) => (
          <div key={example} className="flex items-start gap-2 p-3 rounded-lg border bg-card text-sm text-muted-foreground">
            <span className="text-primary mt-0.5">›</span>
            <span>&quot;{example}&quot;</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step: Pronto! ────────────────────────────────────────────────────────────
function StepReady({ workspace, userProfile }: { workspace: Workspace | null; userProfile: User | null }) {
  const firstName = userProfile?.name?.split(' ')[0] || 'você';
  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-14 w-14 text-green-500" />
      </div>
      <div>
        <h2 className="text-3xl font-bold">Tudo pronto, {firstName}!</h2>
        <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
          Você já conhece os principais pontos de{' '}
          <span className="font-semibold text-foreground">{workspace?.name}</span>. Agora é hora de mergulhar no conteúdo, completar seus treinamentos e usar o assistente sempre que precisar.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Users className="h-3 w-3 mr-1.5" /> Bem-vindo(a) ao time!
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Layers className="h-3 w-3 mr-1.5" /> Base de conhecimento disponível
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <BookOpen className="h-3 w-3 mr-1.5" /> Treinamentos aguardam você
        </Badge>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [profileData, setProfileData] = useState({ role: '', sector: '' });

  // Fetch workspace
  const workspaceRef = useMemoFirebase(
    () => (firestore && workspaceId ? doc(firestore, 'workspaces', workspaceId) : null),
    [firestore, workspaceId]
  );
  const { data: workspace, isLoading: isWorkspaceLoading } = useDoc<Workspace>(workspaceRef);

  // Fetch user profile
  const userRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

  // Fetch published knowledge
  const pkRef = useMemoFirebase(
    () => (firestore && workspaceId ? doc(firestore, `workspaces/${workspaceId}/published_knowledge`, workspaceId) : null),
    [firestore, workspaceId]
  );
  const { data: knowledge, isLoading: isKnowledgeLoading } = useDoc<PublishedKnowledge>(pkRef);

  // Fetch playbooks
  const playbooksQuery = useMemoFirebase(
    () =>
      firestore && workspaceId
        ? query(collection(firestore, `workspaces/${workspaceId}/playbooks`), where('status', '==', 'published'))
        : null,
    [firestore, workspaceId]
  );
  const { data: playbooks, isLoading: isPlaybooksLoading } = useCollection<Playbook>(playbooksQuery);

  // Fetch training modules
  const modulesQuery = useMemoFirebase(
    () =>
      firestore && workspaceId
        ? query(collection(firestore, `workspaces/${workspaceId}/training_modules`))
        : null,
    [firestore, workspaceId]
  );
  const { data: modules, isLoading: isModulesLoading } = useCollection<TrainingModule>(modulesQuery);

  const isLoading = isUserLoading || isWorkspaceLoading || isProfileLoading || isKnowledgeLoading || isPlaybooksLoading || isModulesLoading;

  const steps = useMemo(
    () => [
      {
        id: 'welcome',
        label: 'Boas-vindas',
        component: <StepWelcome workspace={workspace} userProfile={userProfile} />,
      },
      {
        id: 'about',
        label: 'A empresa',
        component: <StepAboutCompany workspace={workspace} />,
      },
      {
        id: 'profile',
        label: 'Seu perfil',
        component: <StepCollaboratorProfile profileData={profileData} onChange={setProfileData} />,
      },
      {
        id: 'knowledge',
        label: 'Conhecimento',
        component: <StepKnowledgeBase knowledge={knowledge} />,
      },
      {
        id: 'processes',
        label: 'Processos',
        component: <StepKeyProcesses playbooks={playbooks} />,
      },
      {
        id: 'learning',
        label: 'Treinamentos',
        component: <StepLearningPath modules={modules} />,
      },
      {
        id: 'assistant',
        label: 'Assistente IA',
        component: <StepAssistant workspace={workspace} />,
      },
      {
        id: 'ready',
        label: 'Pronto!',
        component: <StepReady workspace={workspace} userProfile={userProfile} />,
      },
    ],
    [workspace, userProfile, knowledge, playbooks, modules, profileData]
  );

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep((s) => s + 1);
    }
  }, [isLastStep]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((s) => s - 1);
    }
  }, [isFirstStep]);

  const handleComplete = useCallback(async () => {
    if (!user) return;
    setIsCompleting(true);
    try {
      await completeOnboarding(workspaceId, user.uid, {
        role: profileData.role || undefined,
        sector: profileData.sector || undefined,
      });
      router.replace(`/collaborator/${workspaceId}/home`);
    } catch {
      setIsCompleting(false);
    }
  }, [user, workspaceId, profileData, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-2xl" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {workspace?.logoUrl && (
            <div className="relative h-8 w-8">
              <Image src={workspace.logoUrl} alt={workspace.name} fill className="object-contain" />
            </div>
          )}
          {!workspace?.logoUrl && <Building2 className="h-6 w-6 text-primary" />}
          <span className="font-semibold text-sm hidden sm:block">{workspace?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {currentStep + 1} de {steps.length}
          </span>
          <StepIndicator current={currentStep} total={steps.length} />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300" key={currentStep}>
          {currentStepData.component}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="px-6 py-6 border-t bg-background flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={isFirstStep}
          className="min-w-[100px]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <p className="text-sm text-muted-foreground text-center hidden sm:block">
          {currentStepData.label}
        </p>

        {isLastStep ? (
          <Button onClick={handleComplete} disabled={isCompleting} className="min-w-[160px]">
            {isCompleting ? 'Entrando...' : 'Entrar no workspace'}
            {!isCompleting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        ) : (
          <Button onClick={handleNext} className="min-w-[100px]">
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </footer>
    </div>
  );
}


'use client';

import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Plus, Bot, User as UserIcon, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import React, { useState, useRef, useEffect } from 'react';
import { AssistantThread, AssistantMessage } from '@/lib/firestore-types';
import { useToast } from '@/hooks/use-toast';
import { chatWithKnowledgeAssistant } from '@/ai/flows/chat-with-knowledge-assistant';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function ThreadList({
  threads,
  activeThreadId,
  setActiveThreadId,
  onNewThread,
  isLoading,
}: {
  threads: (AssistantThread & { id: string })[] | null;
  activeThreadId: string | null;
  setActiveThreadId: (id: string) => void;
  onNewThread: () => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={onNewThread} className="w-full">
          <Plus className="mr-2" /> Nova Conversa
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
            {threads?.map((thread) => (
            <Button
                key={thread.id}
                variant="ghost"
                className={cn(
                'w-full justify-start text-left h-auto py-2',
                activeThreadId === thread.id && 'bg-muted'
                )}
                onClick={() => setActiveThreadId(thread.id)}
            >
                <div className="truncate">
                    <p className="font-semibold text-sm">{thread.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {thread.createdAt?.toDate() ? formatDistanceToNow(thread.createdAt.toDate(), { locale: ptBR, addSuffix: true }) : 'agora'}
                    </p>
                </div>
            </Button>
            ))}
             {threads?.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma conversa iniciada.</p>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ChatMessage({ message }: { message: AssistantMessage }) {
    const isUser = message.role === 'user';
    return (
        <div className={cn("flex items-start gap-4", isUser ? 'justify-end' : 'justify-start')}>
             {!isUser && (
                <Avatar className="h-8 w-8 bg-primary/20 text-primary flex-shrink-0">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "max-w-xl rounded-lg px-4 py-3 text-sm",
                isUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
            )}>
                <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
             {isUser && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                </Avatar>
            )}
        </div>
    )
}

export default function AssistantPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const params = useParams();
  const { toast } = useToast();
  const workspaceId = params.workspaceId as string;
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  const threadsQuery = useMemoFirebase(() => {
    if (!firestore || !workspaceId) return null;
    return query(collection(firestore, `workspaces/${workspaceId}/assistant_threads`), orderBy('createdAt', 'desc'));
  }, [firestore, workspaceId]);
  const { data: threads, isLoading: isThreadsLoading } = useCollection<AssistantThread>(threadsQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !activeThreadId) return null;
    return query(collection(firestore, `workspaces/${workspaceId}/assistant_threads/${activeThreadId}/messages`), orderBy('createdAt', 'asc'));
  }, [firestore, activeThreadId]);
  const { data: messages } = useCollection<AssistantMessage>(messagesQuery);
  
  useEffect(() => {
    // Auto-scroll to bottom when new messages appear
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);


  const handleNewThread = async () => {
    if (!firestore || !user) return;
    try {
        const threadRef = collection(firestore, `workspaces/${workspaceId}/assistant_threads`);
        const newThread = await addDocumentNonBlocking(threadRef, {
            title: 'Nova Conversa',
            createdBy: user.uid,
            createdAt: serverTimestamp()
        });
        if(newThread) {
            setActiveThreadId(newThread.id);
        }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar conversa.' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeThreadId || !firestore || !user || isSending) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
        const messagesRef = collection(firestore, `workspaces/${workspaceId}/assistant_threads/${activeThreadId}/messages`);
        
        // Optimistically add user message
        const userMessagePayload = { role: 'user', content: userMessage, createdAt: serverTimestamp(), createdBy: user.uid };
        await addDocumentNonBlocking(messagesRef, userMessagePayload);

        // Update thread title with the first message content if it's a "Nova Conversa"
        const activeThread = threads?.find(t => t.id === activeThreadId);
        if (activeThread && activeThread.title === 'Nova Conversa') {
            const threadRef = doc(firestore, `workspaces/${workspaceId}/assistant_threads`, activeThreadId);
            // This is a non-blocking update
            updateDoc(threadRef, { title: userMessage.substring(0, 40) });
        }
        
        // Assemble chat history
        const chatHistory = (messages || []).map(m => ({ role: m.role, content: m.content }));

        // Call the AI flow
        const result = await chatWithKnowledgeAssistant({
            query: userMessage,
            workspaceId: workspaceId,
            chatHistory: chatHistory,
        });

        // Add assistant response
        const assistantMessagePayload = { role: 'assistant', content: result.response, createdAt: serverTimestamp() };
        await addDocumentNonBlocking(messagesRef, assistantMessagePayload);

    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao obter resposta.', description: error.message });
    } finally {
        setIsSending(false);
    }
  };


  return (
    <div className="flex h-screen bg-background">
      <aside className="w-1/4 max-w-xs border-r">
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          setActiveThreadId={setActiveThreadId}
          onNewThread={handleNewThread}
          isLoading={isThreadsLoading}
        />
      </aside>
      <main className="flex flex-1 flex-col">
        {activeThreadId ? (
             <div className="flex flex-1 flex-col">
                <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                    <div className="space-y-6">
                        {messages?.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
                        {isSending && (
                            <div className="flex items-start gap-4 justify-start">
                                <Avatar className="h-8 w-8 bg-primary/20 text-primary flex-shrink-0">
                                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div className="max-w-xl rounded-lg px-4 py-3 text-sm bg-muted rounded-bl-none">
                                    <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="relative">
                        <Input
                        placeholder="Pergunte algo sobre a base de conhecimento..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isSending || !activeThreadId}
                        className="pr-12 text-base"
                        />
                        <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" disabled={isSending || !inputMessage.trim()}>
                            {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                        </Button>
                    </form>
                </div>
            </div>
        ) : (
             <div className="flex flex-1 items-center justify-center">
                <Alert className="max-w-md">
                    <MessageSquare className="h-4 w-4" />
                    <AlertTitle>Assistente Narros</AlertTitle>
                    <AlertDescription>
                       Selecione uma conversa ou crie uma nova para começar a perguntar.
                    </AlertDescription>
                </Alert>
            </div>
        )}
      </main>
    </div>
  );
}

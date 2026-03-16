
'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Workspace } from '@/lib/firestore-types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminWorkspacesPage() {
    const firestore = useFirestore();
    const workspacesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'workspaces') : null, [firestore]);
    const { data: workspaces, isLoading } = useCollection<Workspace>(workspacesQuery);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Workspaces</CardTitle>
                <CardDescription>Lista de todos os workspaces na plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Proprietário</TableHead>
                            <TableHead>Membros</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 3}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            </TableRow>
                        ))}
                        {workspaces?.map(ws => (
                            <TableRow key={ws.id}>
                                <TableCell className="font-medium">{ws.name}</TableCell>
                                <TableCell className="text-muted-foreground text-xs font-mono">{ws.ownerId}</TableCell>
                                <TableCell>{ws.members.length}</TableCell>
                                <TableCell><Badge variant="secondary">{ws.status}</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

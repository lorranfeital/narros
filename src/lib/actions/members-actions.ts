'use server';

import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { Workspace, WorkspaceRole } from '@/lib/firestore-types';

function getAdminFirestore() {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

async function verifyAdmin(
  db: any,
  workspaceId: string,
  adminId: string
): Promise<Workspace> {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  const workspaceSnap = await getDoc(workspaceRef);

  if (!workspaceSnap.exists()) {
    throw new Error('Workspace não encontrado.');
  }

  const workspace = workspaceSnap.data() as Workspace;
  const adminRole = workspace.roles?.[adminId];
  const isAdmin = adminRole === 'admin';

  if (!isAdmin) {
    throw new Error('Ação não autorizada. Apenas administradores podem gerenciar membros.');
  }

  return workspace;
}


export async function inviteUserToWorkspace(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  inviterId: string
) {
    const db = getAdminFirestore();
    const workspace = await verifyAdmin(db, workspaceId, inviterId);

    if (!email) {
        return { success: false, message: 'O e-mail é obrigatório.' };
    }

    const userQuery = query(collection(db, 'users'), where('email', '==', email), limit(1));
    const userSnap = await getDocs(userQuery);

    if (userSnap.empty) {
        return { success: false, message: `Nenhum usuário encontrado com o e-mail: ${email}. Peça para que ele crie uma conta na plataforma primeiro.` };
    }

    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;

    if (workspace.members.includes(userId)) {
        return { success: false, message: 'Este usuário já é membro do workspace.' };
    }

    try {
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        await updateDoc(workspaceRef, {
            members: arrayUnion(userId),
            [`roles.${userId}`]: role,
        });
        return { success: true, message: `Usuário ${email} convidado como ${role}.` };
    } catch (error) {
        console.error("Error inviting user:", error);
        return { success: false, message: "Ocorreu um erro ao convidar o usuário." };
    }
}

export async function updateUserRole(
  workspaceId: string,
  targetUserId: string,
  role: WorkspaceRole,
  adminId: string
) {
    const db = getAdminFirestore();
    const workspace = await verifyAdmin(db, workspaceId, adminId);

    if (workspace.ownerId === targetUserId) {
        return { success: false, message: 'Não é possível alterar o perfil do proprietário do workspace.' };
    }

    if (!workspace.members.includes(targetUserId)) {
         return { success: false, message: 'O usuário não é membro deste workspace.' };
    }

    try {
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        await updateDoc(workspaceRef, {
            [`roles.${targetUserId}`]: role,
        });
        return { success: true, message: 'Perfil do usuário atualizado.' };
    } catch (error) {
        console.error("Error updating role:", error);
        return { success: false, message: "Ocorreu um erro ao atualizar o perfil." };
    }
}

export async function removeUserFromWorkspace(
  workspaceId: string,
  targetUserId: string,
  adminId: string
) {
    const db = getAdminFirestore();
    const workspace = await verifyAdmin(db, workspaceId, adminId);
     
    if (workspace.ownerId === targetUserId) {
        return { success: false, message: 'Não é possível remover o proprietário do workspace.' };
    }

    if (!workspace.members.includes(targetUserId)) {
         return { success: false, message: 'O usuário não é membro deste workspace.' };
    }

    try {
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        await updateDoc(workspaceRef, {
            members: arrayRemove(targetUserId),
            [`roles.${targetUserId}`]: deleteField(),
        });
        return { success: true, message: 'Usuário removido do workspace.' };
    } catch (error) {
        console.error("Error removing user:", error);
        return { success: false, message: "Ocorreu um erro ao remover o usuário." };
    }
}

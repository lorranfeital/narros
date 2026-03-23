
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
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getApps, initializeApp, getApp, deleteApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
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
  const isAdmin = workspace.ownerId === adminId || workspace.roles?.[adminId] === 'admin';

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

    let userId: string;
    let isNewUser = false;

    if (userSnap.empty) {
        isNewUser = true;
        // Use a temporary app instance to create the user to avoid auth state pollution on the server.
        const tempAppName = `temp-user-creation-${Date.now()}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        try {
            const tempPassword = Math.random().toString(36).slice(-8) + 'A1b2c3!';
            const userCredential = await createUserWithEmailAndPassword(tempAuth, email, tempPassword);
            userId = userCredential.user.uid;

            // Create a user document in Firestore for the new user.
            const newUserRef = doc(db, 'users', userId);
            await setDoc(newUserRef, {
                id: userId,
                name: email.split('@')[0],
                email: email,
                plan: "free",
                createdAt: serverTimestamp(),
            });

        } catch (error: any) {
             if (error.code === 'auth/email-already-in-use') {
                return { success: false, message: 'Este e-mail já está em uso. Peça para o usuário acessar a plataforma e ele poderá ser convidado.' };
            }
             if (error.code === 'auth/invalid-email') {
                return { success: false, message: 'O formato do e-mail fornecido é inválido.' };
            }
            console.error("Error creating user:", error);
            return { success: false, message: `Ocorreu um erro ao criar o novo usuário: ${error.message}` };
        } finally {
            // Clean up the temporary app instance.
            await deleteApp(tempApp);
        }
    } else {
        const userDoc = userSnap.docs[0];
        userId = userDoc.id;
        if (workspace.members.includes(userId)) {
            return { success: false, message: 'Este usuário já é membro do workspace.' };
        }
    }

    try {
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        await updateDoc(workspaceRef, {
            members: arrayUnion(userId),
            [`roles.${userId}`]: role,
        });

        if (isNewUser) {
            return { success: true, message: `Usuário ${email} criado e convidado como ${role}. Ele precisará usar a função 'Esqueci minha senha' para definir uma senha e acessar.` };
        } else {
            return { success: true, message: `Usuário ${email} convidado como ${role}.` };
        }
    } catch (error) {
        console.error("Error inviting user:", error);
        return { success: false, message: "Ocorreu um erro ao adicionar o usuário ao workspace." };
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

export async function updateUserName(
  workspaceId: string,
  targetUserId: string,
  newName: string,
  adminId: string
) {
    const db = getAdminFirestore();
    // Throws an error if adminId is not an admin, which is what we want.
    await verifyAdmin(db, workspaceId, adminId);

    if (!newName || newName.trim().length < 2) {
        return { success: false, message: 'O nome deve ter pelo menos 2 caracteres.' };
    }

    try {
        const userRef = doc(db, 'users', targetUserId);
        await updateDoc(userRef, {
            name: newName,
        });
        return { success: true, message: 'Nome do usuário atualizado.' };
    } catch (error) {
        console.error("Error updating user name:", error);
        return { success: false, message: "Ocorreu um erro ao atualizar o nome do usuário." };
    }
}

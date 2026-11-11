'use client';
import { useSession } from '@/features/auth';
export function AdminAccessBoundary({owner,children}:{owner:string;children:React.ReactNode}) {
 const {session}=useSession();
 if(session.status!=='authenticated'||session.user.role!=='administrador'||String(session.user.id)!==owner)return <p role="status">Comprueba tu sesión administrativa para continuar.</p>;
 return children;
}

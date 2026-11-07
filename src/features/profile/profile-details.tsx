"use client";
import { ApiError } from "@/lib/api/client";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { useProfile } from "./queries";

export function ProfileDetails() {
  const { data, error, isFetching, refetch } = useProfile();
  if (error instanceof ApiError && [401, 403].includes(error.status)) return <p role="status">Comprobando acceso…</p>;
  return <>
    {error && <Notice kind="error">
      {error instanceof ApiError ? error.message : "No pudimos cargar tu perfil. Inténtalo de nuevo."}{" "}
      <Button variant="link" disabled={isFetching} onClick={() => void refetch()}>Reintentar</Button>
    </Notice>}
    {data ? <ProfileForm key={data.id} profile={data}/> : !error && <p role="status">Cargando tu perfil…</p>}
  </>;
}

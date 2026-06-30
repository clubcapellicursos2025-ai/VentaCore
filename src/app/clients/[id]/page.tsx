import { ClientView } from "@/components/features/clients/ClientView";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 16 (App Router), los params de una página server son una promesa
  const resolvedParams = await params;
  
  return (
    <div className="space-y-6">
      <ClientView clientId={resolvedParams.id} />
    </div>
  );
}

import { VendorView } from "@/components/features/vendors/VendorView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Link href="/vendors" className="text-sm text-slate-400 hover:text-white flex items-center gap-2 w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a Vendedores
        </Link>
      </div>
      <VendorView vendorId={resolvedParams.id} />
    </div>
  );
}

import React from "react";
import { getVendorsList } from "@/actions/vendorActions";
import { VendorsCrudClient } from "@/components/features/vendors/VendorsCrudClient";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const initialVendors = await getVendorsList();

  return (
    <div className="py-2">
      <VendorsCrudClient initialVendors={initialVendors} />
    </div>
  );
}


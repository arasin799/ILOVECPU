import StaffOrderQueue from "./StaffOrderQueue";

// Thin wrapper that reuses the shared staff order queue in processing mode.
export default function StaffProcessOrders() {
  return <StaffOrderQueue mode="processing" />;
}

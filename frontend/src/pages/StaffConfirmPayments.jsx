import StaffOrderQueue from "./StaffOrderQueue";

// Thin wrapper that reuses the shared staff order queue in payment-confirmation mode.
export default function StaffConfirmPayments() {
  return <StaffOrderQueue mode="payment" />;
}

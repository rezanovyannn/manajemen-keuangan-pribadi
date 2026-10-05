import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function DeleteTransactionButton({ action, isTransfer }: { action: () => Promise<void>; isTransfer: boolean }) {
  return (
    <ConfirmDeleteButton
      action={action}
      label="Hapus transaksi"
      message={`Yakin hapus transaksi ini?${isTransfer ? " Kedua sisi transfer akan ikut terhapus." : ""}`}
    />
  );
}

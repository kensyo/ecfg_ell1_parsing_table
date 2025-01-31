import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmDialogProps = {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({
  open,
  options,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!open) return null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title || "確認"}</AlertDialogTitle>
          <AlertDialogDescription>
            {options.description || "この操作を実行しますか？"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {options.cancelText || "キャンセル"}
          </Button>
          <Button onClick={onConfirm}>{options.confirmText || "OK"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    resolve?: (value: boolean) => void;
    options: ConfirmOptions;
  }>({ open: false, options: {} });

  const confirmDialog = useCallback(
    (options: ConfirmOptions = {}): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({ open: true, resolve, options });
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    confirmState.resolve?.(true);
    setConfirmState((prev) => ({ ...prev, open: false }));
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    confirmState.resolve?.(false);
    setConfirmState((prev) => ({ ...prev, open: false }));
  }, [confirmState]);

  const ConfirmProvider = useCallback(
    () => (
      <ConfirmDialog
        open={confirmState.open}
        options={confirmState.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [confirmState, handleConfirm, handleCancel],
  );

  return { confirmDialog, ConfirmProvider };
};

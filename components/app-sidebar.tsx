"use client";

import {
  BookOpen,
  CircleX,
  EllipsisVertical,
  FolderPen,
  Plus,
  Save,
  SaveAll,
} from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { useCallback, useEffect, useState } from "react";
import { ECFG } from "./core-contents";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { defaultECFG } from "./core-contents";
import { toast } from "sonner";
import { useConfirm } from "./alert-dialog-wrapper";

type SaveItem = {
  key: string; // localStorage のキー
  name: string; // ユーザーが指定した名前
  updatedAt: number;
};

type SaveData = {
  name: string;
  updatedAt: number;
  data: ECFG;
};

export function AppSidebar() {
  const { isMobile } = useSidebar();
  const { confirmDialog, ConfirmProvider } = useConfirm();

  function isECFGEqual(a: ECFG, b: ECFG): boolean {
    return (
      JSON.stringify(a.terminals) === JSON.stringify(b.terminals) &&
      JSON.stringify(a.nonTerminals) === JSON.stringify(b.nonTerminals) &&
      JSON.stringify(a.productions) === JSON.stringify(b.productions) &&
      a.startSymbol === b.startSymbol
    );
  }

  // ロード中のデータを localStorage から取り出すヘルパー
  function getCurrentLoadedData(): ECFG | null {
    if (!currentLoadedKey) return null;
    const raw = localStorage.getItem(currentLoadedKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SaveData;
      return parsed.data;
    } catch {
      return null;
    }
  }

  const [openedDialog, setOpenedDialog] = useState<"delete" | "rename">();

  const { resetField, reset, getValues } = useFormContext<ECFG>();

  // UI: セーブ名入力
  const [saveName, setSaveName] = useState("");

  // 現在ロード中のキー & 名前 → 上書きセーブに使う
  // 要求仕様: 「ロード中なら、キーと名前を表示しておく」
  const [currentLoadedKey, setCurrentLoadedKey] = useState("");

  // -------------------------------------
  // localStorage からセーブ一覧を読み込み & 更新
  // -------------------------------------
  const [saveList, setSaveList] = useState<SaveItem[]>([]);

  const refreshSaveList = useCallback(() => {
    const arr: SaveItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("myECFGData_")) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as SaveData;
          arr.push({
            key: k,
            name: parsed.name,
            updatedAt: parsed.updatedAt,
          });
        } catch (e) {
          console.warn("Failed to parse storage item", k, e);
        }
      }
    }
    // updatedAt 降順でソート
    arr.sort((a, b) => b.updatedAt - a.updatedAt);
    setSaveList(arr);
  }, []);

  useEffect(() => {
    refreshSaveList();
  }, [refreshSaveList]);

  // -------------------------------------
  // 新規セーブ
  // -------------------------------------
  const handleNewSave = () => {
    if (!saveName) {
      toast.error("Please enter a save name.");
      return;
    }
    const data = getValues();
    const now = Date.now();
    // 新規キー (同名でも別キー)
    const newKey = `myECFGData_${now}`;
    const obj: SaveData = {
      name: saveName,
      updatedAt: now,
      data,
    };
    localStorage.setItem(newKey, JSON.stringify(obj));
    toast.success("New save created successfully!", {
      description: `Save Name: ${saveName}`,
    });
    setSaveName("");

    // ★ 新規セーブ後、そのデータをロード中にする
    setCurrentLoadedKey(newKey);

    refreshSaveList();
  };

  // -------------------------------------
  // 上書きセーブ (ロード中のキーがある場合のみ)
  // -------------------------------------
  const handleOverwriteSave = () => {
    if (!currentLoadedKey) {
      toast.error("No loaded data available. Unable to overwrite.");
      return;
    }
    const raw = localStorage.getItem(currentLoadedKey);
    if (!raw) {
      toast.error("Save data not found. It may have been deleted.");
      setCurrentLoadedKey("");
      refreshSaveList();
      return;
    }
    try {
      const oldObj = JSON.parse(raw) as SaveData;
      const newData = getValues();
      const now = Date.now();
      const updated: SaveData = {
        name: oldObj.name, // セーブ名は変えない
        updatedAt: now,
        data: newData,
      };
      localStorage.setItem(currentLoadedKey, JSON.stringify(updated));
      toast.success("Save overwritten successfully!", {
        description: `Save Name: ${oldObj.name}`,
      });

      // 更新時刻が変わったので一覧再読み込み
      refreshSaveList();
    } catch (e) {
      toast.error("Failed to overwrite save. JSON parsing error?");
      console.error(e);
    }
  };

  // -------------------------------------
  // ★ 追加: Rename Save
  // -------------------------------------
  const handleRenameSave = (key: string) => {
    if (!key) {
      toast.error("No loaded data available. Unable to overwrite.");
      return;
    }
    if (!saveName) {
      toast.error("Please enter a new save name.");
      return;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      toast.error("Save data not found. It may have been deleted.");
      setCurrentLoadedKey("");
      refreshSaveList();
      return;
    }
    try {
      const oldObj = JSON.parse(raw) as SaveData;
      // 名前だけ変更
      // const now = Date.now();
      const renamed: SaveData = {
        ...oldObj,
        name: saveName,
        // updatedAt: now, // 名前変更タイミングで更新日時も変える
      };
      localStorage.setItem(key, JSON.stringify(renamed));

      // セーブ名入力フォームはクリア or 継続好みで
      setSaveName("");

      toast.info(
        `Save renamed successfully: ${oldObj.name} -> ${renamed.name}`,
      );
      refreshSaveList();
    } catch (e) {
      toast.error("Failed to rename save. JSON parsing error?");
      console.error(e);
    }
  };

  // -------------------------------------
  // 新規データ (フォーム初期化 & ロード状態を解除)
  // 何もロードしていない or ロード中 => 変更があれば確認
  // -------------------------------------
  const handleNewData = async () => {
    // 1) 何もロードしていない状態
    if (!currentLoadedKey) {
      // フォームが初期状態と異なる場合は確認
      if (!isECFGEqual(getValues(), defaultECFG)) {
        if (
          !(await confirmDialog({
            title: "Confirmation",
            description:
              "The form is not in its initial state. Discard changes and create a new grammar?",
            confirmText: "Create",
            cancelText: "Cancel",
          }))
        ) {
          return;
        }
      }
    } else {
      // 2) 何かしらロード中のデータがある場合
      const loaded = getCurrentLoadedData();
      if (loaded && !isECFGEqual(getValues(), loaded)) {
        if (
          !(await confirmDialog({
            title: "Confirmation",
            description:
              "There are unsaved changes to the currently loaded data. Discard changes and create a new grammar?",
            confirmText: "Create",
            cancelText: "Cancel",
          }))
        ) {
          return;
        }
      }
    }

    reset(defaultECFG);
    setCurrentLoadedKey("");
  };

  // -------------------------------------
  // ロード
  // -------------------------------------
  const handleLoad = async (key: string) => {
    if (!key) {
      toast.error("Please select a save to load.");
      return;
    }

    // 1) 何もロードしていない状態
    if (!currentLoadedKey) {
      if (!isECFGEqual(getValues(), defaultECFG)) {
        if (
          !(await confirmDialog({
            title: "Confirmation",
            description:
              "The form is not in its initial state. Discard changes and create a new grammar?",
            confirmText: "Create",
            cancelText: "Cancel",
          }))
        ) {
          return;
        }
      }
    } else {
      // 2) ロード中のデータがある状態
      const loaded = getCurrentLoadedData();
      if (loaded && !isECFGEqual(getValues(), loaded)) {
        if (
          !(await confirmDialog({
            title: "Confirmation",
            description:
              "There are unsaved changes to the currently loaded data. Discard changes and create a new grammar?",
            confirmText: "Create",
            cancelText: "Cancel",
          }))
        ) {
          return;
        }
      }
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      toast.error(
        "The selected save data was not found. It may have been deleted.",
      );
      return;
    }
    try {
      const parsed = JSON.parse(raw) as SaveData;
      const ecfgData = parsed.data;

      // 同様に、Select系は一度初期化してから リセット
      reset({
        ...ecfgData,
        startSymbol: "",
        forFollowSet: "__none__",
        forDirectorSet: "__none__",
      });
      setTimeout(() => {
        resetField("startSymbol", { defaultValue: ecfgData.startSymbol });
        resetField("forFollowSet", { defaultValue: ecfgData.forFollowSet });
        resetField("forDirectorSet", { defaultValue: ecfgData.forDirectorSet });
      }, 0);

      // ロード状態
      setCurrentLoadedKey(key);
      toast.success(`Loaded save: ${parsed.name}`);
    } catch (e) {
      toast.error("Failed to load save. JSON parsing error?");
      console.error(e);
    }
  };

  // -------------------------------------
  // 削除
  // -------------------------------------
  const handleDelete = (key: string) => {
    if (!key) {
      toast.error("Please select a save to delete.");
      return;
    }
    localStorage.removeItem(key);
    toast.error("Save deleted");
    // もしロード中のデータを消したらロード状態をクリア
    if (key === currentLoadedKey) {
      setCurrentLoadedKey("");
    }
    refreshSaveList();
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <p className="p-2">Save menu</p>
        <SidebarMenu className="space-y-1 px-4">
          <SidebarMenuItem>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  className="flex w-full items-center justify-start gap-4 px-6"
                >
                  <Save />
                  Save as new
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Save the grammer as new</DialogTitle>
                  <DialogDescription>
                    Enter a name of the grammer
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      onClick={handleNewSave}
                      disabled={!saveName}
                    >
                      Save
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              type="button"
              className="flex w-full items-center justify-start gap-4 px-6"
              variant="default"
              disabled={!currentLoadedKey}
              onClick={handleOverwriteSave}
            >
              <SaveAll className="size-5" />
              Save (overwrite)
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              type="button"
              className="flex w-full items-center justify-start gap-4 px-6"
              variant="default"
              onClick={handleNewData}
            >
              <Plus className="size-5" />
              New Grammer
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Saved Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {saveList.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    className={cn(
                      currentLoadedKey == item.key && "bg-sidebar-accent",
                      "has-[button:hover]:bg-transparent",
                    )}
                    asChild
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) {
                        return;
                      }
                      handleLoad(item.key);
                    }}
                  >
                    <div className="flex" tabIndex={0}>
                      <span className="pointer-events-none flex-1">
                        {item.name}
                      </span>
                      <Dialog>
                        <DropdownMenu modal={isMobile}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="rounded-full"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <span className="sr-only">Open menu</span>
                              <EllipsisVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoad(item.key);
                              }}
                            >
                              <BookOpen />
                              <span>Load</span>
                            </DropdownMenuItem>
                            <DialogTrigger
                              asChild
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenedDialog("rename");
                              }}
                            >
                              <DropdownMenuItem>
                                <FolderPen />
                                <span>Rename</span>
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogTrigger
                              asChild
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenedDialog("delete");
                              }}
                            >
                              <DropdownMenuItem>
                                <CircleX className="text-destructive" />
                                <span className="text-destructive">Delete</span>
                              </DropdownMenuItem>
                            </DialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DialogContent
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {openedDialog === "rename" ? (
                            <>
                              <DialogHeader>
                                <DialogTitle>
                                  Rename the data &quot;{item.name}&quot;
                                </DialogTitle>
                                <DialogDescription>
                                  Enter a new name of the data
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="name" className="text-right">
                                    Name
                                  </Label>
                                  <Input
                                    value={saveName}
                                    onChange={(e) =>
                                      setSaveName(e.target.value)
                                    }
                                    className="col-span-3"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameSave(item.key);
                                    }}
                                    disabled={!saveName}
                                  >
                                    Save
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </>
                          ) : (
                            <>
                              <DialogHeader>
                                <DialogTitle>
                                  Delete the data &quot;{item.name}&quot;
                                </DialogTitle>
                                <DialogDescription>
                                  This action cannot be undone. Are you sure you
                                  want to delete &quot;{item.name}&quot;?
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button" variant="secondary">
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button
                                    variant="destructive"
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(item.key);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <ConfirmProvider />
    </Sidebar>
  );
}

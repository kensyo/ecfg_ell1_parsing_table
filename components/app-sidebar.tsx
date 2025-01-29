"use client";

import {
  BookOpen,
  CircleX,
  EllipsisVertical,
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

  const { resetField, reset, getValues } = useFormContext<ECFG>();

  // UI: セーブ名入力
  const [saveName, setSaveName] = useState("");

  // UI: ロード/削除用に選択中のキー
  const [selectedKey, setSelectedKey] = useState("");

  // 現在ロード中のキー & 名前 → 上書きセーブに使う
  // 要求仕様: 「ロード中なら、キーと名前を表示しておく」
  const [currentLoadedKey, setCurrentLoadedKey] = useState("");
  const [currentLoadedName, setCurrentLoadedName] = useState("");

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
      alert("セーブ名を入力してください。");
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
    alert(`新規セーブ: "${saveName}" (key=${newKey})`);
    setSaveName("");

    // ★ 新規セーブ後、そのデータをロード中にする
    setCurrentLoadedKey(newKey);
    setCurrentLoadedName(saveName);

    refreshSaveList();
  };

  // -------------------------------------
  // 上書きセーブ (ロード中のキーがある場合のみ)
  // -------------------------------------
  const handleOverwriteSave = () => {
    if (!currentLoadedKey) {
      alert("ロード中のセーブデータがありません (上書き不可)。");
      return;
    }
    const raw = localStorage.getItem(currentLoadedKey);
    if (!raw) {
      alert("ロード中のキーが見つかりません。削除された可能性があります。");
      setCurrentLoadedKey("");
      setCurrentLoadedName("");
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
      alert(`上書きしました: ${oldObj.name} (key=${currentLoadedKey})`);

      // 更新時刻が変わったので一覧再読み込み
      refreshSaveList();
    } catch (e) {
      alert("上書きに失敗しました。パースエラー?");
      console.error(e);
    }
  };
  // -------------------------------------
  // 新規データ (フォーム初期化 & ロード状態を解除)
  // 何もロードしていない or ロード中 => 変更があれば確認
  // -------------------------------------
  const handleNewData = () => {
    // 1) 何もロードしていない状態
    if (!currentLoadedKey) {
      // フォームが初期状態と異なる場合は確認
      if (!isECFGEqual(getValues(), defaultECFG)) {
        if (
          !confirm(
            "フォームが初期状態ではありません。変更を破棄して新規データを作成しますか？",
          )
        ) {
          return;
        }
      }
    } else {
      // 2) 何かしらロード中のデータがある場合
      const loaded = getCurrentLoadedData();
      if (loaded && !isECFGEqual(getValues(), loaded)) {
        if (
          !confirm(
            "ロード済みのデータから変更があります。破棄して新規データを作成しますか？",
          )
        ) {
          return;
        }
      }
    }

    reset(defaultECFG);
    setCurrentLoadedKey("");
    setCurrentLoadedName("");
  };

  // -------------------------------------
  // ロード
  // -------------------------------------
  const handleLoad = (key: string) => {
    if (!key) {
      alert("ロードするセーブを選択してください。");
      return;
    }

    // 1) 何もロードしていない状態
    if (!currentLoadedKey) {
      if (!isECFGEqual(getValues(), defaultECFG)) {
        if (
          !confirm(
            "フォームが初期状態ではありません。変更を破棄してロードしますか？",
          )
        ) {
          return;
        }
      }
    } else {
      // 2) ロード中のデータがある状態
      const loaded = getCurrentLoadedData();
      if (loaded && !isECFGEqual(getValues(), loaded)) {
        if (
          !confirm(
            "ロード済みデータから変更があります。破棄してロードしますか？",
          )
        ) {
          return;
        }
      }
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      alert("選択されたキーが見つかりません。削除された可能性があります。");
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
      setCurrentLoadedName(parsed.name);
      alert(`ロードしました: ${parsed.name} (key=${key})`);
    } catch (e) {
      alert("ロード失敗 (JSONパースエラー?)");
      console.error(e);
    }
  };

  // -------------------------------------
  // 削除
  // -------------------------------------
  const handleDelete = (key: string) => {
    if (!key) {
      alert("削除するセーブを選択してください。");
      return;
    }
    localStorage.removeItem(key);
    alert(`削除しました: key=${key}`);
    // もしロード中のデータを消したらロード状態をクリア
    if (key === currentLoadedKey) {
      setCurrentLoadedKey("");
      setCurrentLoadedName("");
    }
    setSelectedKey("");
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
                    onClick={(_e) => {
                      handleLoad(item.key);
                      setSelectedKey(item.key);
                    }}
                  >
                    <div className="flex" tabIndex={0}>
                      <span className="flex-1">{item.name}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="rounded-full border-none"
                            variant="ghost"
                            size="icon"
                          >
                            <EllipsisVertical size="20" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoad(item.key);
                              setSelectedKey(item.key);
                            }}
                          >
                            <BookOpen />
                            <span>Load</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.key);
                              setSelectedKey(item.key);
                            }}
                          >
                            <CircleX />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

"use client";

import { ArrowUpFromLine, BookOpen, CircleX, EllipsisVertical, Plus, Save, SaveAll } from "lucide-react";

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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "./ui/dropdown-menu";

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
  const { resetField, reset } = useFormContext<ECFG>();

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

  const handleLoad = (key: string) => {
    if (!key) {
      alert("ロードするセーブを選択してください。");
      return;
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
            <Button
              type="button"
              className="flex w-full items-center justify-start gap-4 px-6"
              variant="default"
            >
              <Save className="size-5" />
              Save as new
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              type="button"
              className="flex w-full items-center justify-start gap-4 px-6"
              variant="default"
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
                  {/* <div className="hover:bg-white has-[p:hover]:bg-blue-500"> */}
                  {/*   <p>ff</p> */}
                  {/*   <p className="hover:bg-red-500"> */}
                  {/*     hoge */}
                  {/*   </p> */}
                  {/* </div> */}
                  {/* <div className="border hover:bg-blue-500 has-[*:hover]:bg-white"> */}
                  {/*   <p className="">ff</p> */}
                  {/*   <p className="hover:bg-red-500">hoge</p> */}
                  {/* </div> */}
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

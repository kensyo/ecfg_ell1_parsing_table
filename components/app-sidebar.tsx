"use client";

import { Plus, Save, SaveAll } from "lucide-react";

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
import { useEffect, useState } from "react";
import { ECFG } from "./core-contents";
import { useFormContext } from "react-hook-form";

export function AppSidebar() {
  const { reset, resetField } = useFormContext<ECFG>();

  const [saveList, setSaveList] = useState<string[]>([]); // localStorage にあるセーブ一覧
  const [selectedLoadName, setSelectedLoadName] = useState(""); // 選択中のロード名

  const refreshSaveList = () => {
    const newList: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("myECFGData_")) {
        newList.push(key.replace("myECFGData_", ""));
      }
    }
    setSaveList(newList);
  };

  useEffect(() => {
    // 初回マウントで一覧読み込み
    refreshSaveList();
  }, []);

  const handleLoad = (name: string) => {
    if (!name) {
      alert("Please select a saved data name from the list.");
      return;
    }
    const raw = localStorage.getItem(`myECFGData_${name}`);
    if (!raw) {
      alert(`No data found for "${name}"`);
      return;
    }
    const parsed = JSON.parse(raw) as ECFG;

    // ★ 1) まず "大部分" を reset
    //    ただし Select フィールド(forFollowSet,forDirectorSet,startSymbol)なども
    //    一旦初期値に戻す(= ""), あとで個別に上書きする。
    reset({
      ...parsed,
      startSymbol: "", // 後で改めて setValue()
      forFollowSet: "__none__",
      forDirectorSet: "__none__",
    });

    // ★ 2) 再レンダリング後に部分的に resetField() / setValue() で上書き
    //    これで Select が watch 依存情報を再取得し、UIが同期される
    setTimeout(() => {
      resetField("startSymbol", { defaultValue: parsed.startSymbol });
      resetField("forFollowSet", { defaultValue: parsed.forFollowSet });
      resetField("forDirectorSet", { defaultValue: parsed.forDirectorSet });
    }, 0);

    alert(`Loaded data: "${name}"`);
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
              {saveList.map((name) => (
                <SidebarMenuItem key={name}>
                  <SidebarMenuButton
                    asChild
                    onClick={(_e) => {
                      handleLoad(name);
                      setSelectedLoadName(name);
                    }}
                  >
                    {/* <item.icon /> */}
                    <span>{name}</span>
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

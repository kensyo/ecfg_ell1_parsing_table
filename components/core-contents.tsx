"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarTrigger } from "./ui/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FormProvider, useForm } from "react-hook-form";

export type Production = {
  lhs: string; // 単一の文字列
  rhs: string[]; // 複数タグの配列
};

export type ECFG = {
  terminals: string[];
  nonTerminals: string[];
  productions: Production[];
  startSymbol: string;
  // ↓ ここで wasm の各メソッド用の引数をフォームに追加
  forNullable: string[];
  forFirstSet: string[];
  forFollowSet: string; // ← Select用, "__none__" なら未選択
  forDirectorSet: string; // ← 同上
};

export default function CoreContents({
  children,
}: {
  children: React.ReactNode;
}) {
  const methods = useForm<ECFG>({
    defaultValues: {
      terminals: [],
      nonTerminals: [],
      productions: [{ lhs: "", rhs: [] }],
      startSymbol: "",
      forNullable: [],
      forFirstSet: [],
      forFollowSet: "__none__",
      forDirectorSet: "__none__",
    },
  });

  return (
    <FormProvider {...methods}>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-1">
          <header className="flex h-14 items-center border-b px-6">
            <SidebarTrigger />
            <Button asChild variant="ghost" className="text-xl font-bold">
              <Link href="/">ECFG Parsing Table</Link>
            </Button>
            <span className="flex-1"></span>
            <ModeToggle />
          </header>

          <div className="mx-auto min-h-[calc(100dvh-128px)] bg-muted/40 p-3">
            {children}
          </div>

          <footer className="sticky top-full flex h-12 items-center justify-center gap-2 border-t px-6">
            <p className="text-sm text-muted-foreground">© kensyo</p>
            <Button size="icon" asChild variant="ghost">
              <a
                href="https://github.com/kensyo/ecfg_ell1_parsing_table"
                target="_blank"
              >
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  className="size-5 fill-primary"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>GitHub</title>
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </Button>
          </footer>
        </div>
      </SidebarProvider>
    </FormProvider>
  );
}

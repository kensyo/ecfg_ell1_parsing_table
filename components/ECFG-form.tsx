"use client";

import { useEffect, useState } from "react";
import {
  useForm,
  FieldErrors,
  useFieldArray,
  Controller,
  useWatch,
} from "react-hook-form";
import { FormItem } from "./ui/form";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { CustomizedInputTags } from "./ui/customized-input-tags";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ECFGWrapper } from "@/wasm_backend/pkg/wasm_backend";

// shadcn/ui のテーブルコンポーネント
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// 変更点: Badge の import
import { Badge } from "@/components/ui/badge";

// -------------------------------------
// 型定義
// -------------------------------------
type Production = {
  lhs: string; // 単一の文字列
  rhs: string[]; // 複数タグの配列
};

type ECFG = {
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

// Rust/wasm のメソッド結果をまとめて格納する型
type WasmResults = {
  isELL1: boolean;
  isNullable: boolean;
  firstSet: string[];
  followSet: string[];
  directorEntries: Array<[string[], string[]]>; // ディレクタセット (キー配列, 値配列)
};

const SPECIAL_STR = ["\\|", "\\(", "\\)", "\\{", "\\}"];

// 変更点: 配列の文字列を Badge で並べるヘルパー関数 (最小限の追加)
function renderBadges(items: string[], asSet: boolean = false) {
  return (
    <>
      {items.length != 0 ? (
        items.map((str, i) => {
          const is_special = SPECIAL_STR.includes(str);
          return (
            <Badge
              key={`${str}-${i}`}
              variant={is_special ? "default" : "secondary"}
              className="mx-1 rounded-md px-1"
            >
              {is_special ? str.slice(1, 2) : str}
            </Badge>
          );
        })
      ) : (
        <p>{asSet ? "∅" : "ε"}</p>
      )}
    </>
  );
}

export default function ECFGForm() {
  // -------------------------------------
  // useForm & State
  // -------------------------------------
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ECFG>({
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
  const [formData, setFormData] = useState<ECFG | null>(null);

  // Rust/wasm メソッドの結果をまとめるステート
  const [wasmResults, setWasmResults] = useState<WasmResults | null>(null);

  // -------------------------------------
  // Field Array: productions
  // -------------------------------------
  const { fields, append, remove } = useFieldArray({
    name: "productions",
    control,
  });

  // -------------------------------------
  // useWatchをコンポーネントのトップレベルで呼び出す
  // -------------------------------------
  const productions = useWatch({ control, name: "productions" });
  const nonTerminals = useWatch({ control, name: "nonTerminals" }) || [];

  // -------------------------------------
  // productions が変化するたび、NonTerminals & Terminals を再計算
  // -------------------------------------
  useEffect(() => {
    if (!productions) return;

    // === NonTerminals: 全LHS を収集 ===
    const lhsSet = new Set<string>();
    productions.forEach((prod) => {
      if (prod.lhs) {
        lhsSet.add(prod.lhs);
      }
    });
    setValue("nonTerminals", Array.from(lhsSet));

    // === Terminals: 全シンボル( LHS + RHS ) から NonTerminals + 特殊記号 を除外
    const specialTokens = new Set(["\\{", "\\}", "\\|", "\\(", "\\)"]);
    const allSymbols = new Set<string>();
    productions.forEach((prod) => {
      if (prod.lhs) {
        allSymbols.add(prod.lhs);
      }
      prod.rhs.forEach((sym) => {
        allSymbols.add(sym);
      });
    });

    // 除外
    for (const nt of lhsSet) {
      allSymbols.delete(nt);
    }
    for (const st of specialTokens) {
      allSymbols.delete(st);
    }
    setValue("terminals", Array.from(allSymbols));
  }, [productions, setValue]);

  // -------------------------------------
  // Submit handlers
  // -------------------------------------
  const onValid = (data: ECFG) => {
    setFormData(data);

    // Rust/wasm のコンストラクタ呼び出し
    const ecfg = new ECFGWrapper(
      data.terminals,
      data.nonTerminals,
      data.productions,
      data.startSymbol,
    );

    // 各メソッドを呼び出す
    const isELL1 = ecfg.is_ell1();
    const isNullable = ecfg.calculate_nullable(data.forNullable);
    const firstSetRaw = ecfg.calculate_first_set(data.forFirstSet);

    // forFollowSet, forDirectorSet が "__none__" ならスキップ
    let followSetRaw: string[] = [];
    if (data.forFollowSet !== "__none__") {
      followSetRaw = ecfg.calculate_follow_set(data.forFollowSet);
    }

    let directorMap: Map<string[], string[]> = new Map();
    if (data.forDirectorSet !== "__none__") {
      directorMap = ecfg.calculate_director_set(data.forDirectorSet);
    }

    // directorMap を配列化
    let directorEntries: Array<[string[], string[]]> = [];
    if (directorMap && typeof directorMap.entries === "function") {
      directorEntries = Array.from(directorMap.entries());
    }

    console.log("isELL1 =>", isELL1);
    console.log("isNullable =>", isNullable);
    console.log("firstSet =>", firstSetRaw);
    console.log("followSet =>", followSetRaw);
    console.log("directorSet =>", directorMap);

    // ステートにまとめて格納
    setWasmResults({
      isELL1,
      isNullable,
      firstSet: firstSetRaw,
      followSet: followSetRaw,
      directorEntries,
    });
  };

  const onInvalid = (errors: FieldErrors<ECFG>) => {
    console.error("Validation errors:", errors);
  };

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-3">
      {/* 1) NonTerminal symbols (auto-generated by productions) */}
      <FormItem>
        <Label>NonTerminal symbols (auto-generated by productions)</Label>
        <Controller
          name="nonTerminals"
          control={control}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              disabled
              onChange={() => {
                // 手動編集不可
              }}
            />
          )}
        />
      </FormItem>

      {/* 2) Terminal symbols (auto-generated by productions) */}
      <FormItem>
        <Label>Terminal symbols (auto-generated by productions)</Label>
        <Controller
          name="terminals"
          control={control}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              disabled
              onChange={() => {
                // 手動編集不可
              }}
            />
          )}
        />
      </FormItem>

      {/* 3) productions (手動編集) */}
      <FormItem>
        <Label>Productions</Label>
        {errors.productions && (
          <span className="px-2 text-sm text-red-500">
            {"The symbol in LHS must not be empty."}
          </span>
        )}
        {fields.map((fieldItem, index) => (
          <div key={fieldItem.id} className="mb-4 flex items-center gap-2">
            <div>
              {errors.productions && errors.productions[index]?.lhs && (
                <span className="px-2 text-sm text-red-500">{"*"}</span>
              )}
            </div>
            <div className="flex-1" style={{ flexBasis: "15%" }}>
              <Controller
                name={`productions.${index}.lhs`}
                rules={{
                  required: "The symbol in LHS must not be empty.",
                }}
                control={control}
                render={({ field }) => (
                  <CustomizedInputTags
                    maxTags={1}
                    {...field}
                    // LHS は単一タグなので配列にして渡す
                    value={field.value ? [field.value] : []}
                    onChange={(newValue) => {
                      if (typeof newValue === "function") {
                        field.onChange("");
                      } else {
                        field.onChange(newValue[0] || "");
                      }
                    }}
                  />
                )}
              />
            </div>

            <span className="font-bold">→</span>

            <div className="flex-1" style={{ flexBasis: "75%" }}>
              <Controller
                name={`productions.${index}.rhs`}
                control={control}
                render={({ field }) => (
                  <CustomizedInputTags
                    {...field}
                    value={field.value}
                    onChange={(newValue) => {
                      if (typeof newValue === "function") {
                        field.onChange([]);
                      } else {
                        field.onChange(newValue);
                      }
                    }}
                  />
                )}
              />
            </div>

            <Button
              type="button"
              onClick={() => remove(index)}
              className="bg-red-500 text-white"
            >
              Remove
            </Button>
          </div>
        ))}

        <Button
          type="button"
          onClick={() => append({ lhs: "", rhs: [] })}
          className="mt-4 bg-green-500 text-white"
        >
          Add Production
        </Button>
      </FormItem>

      {/* 4) Start symbol (NonTerminals から選択) */}
      <FormItem>
        <Label>Start symbol</Label>
        {errors.startSymbol && (
          <span className="px-2 text-sm text-red-500">
            {errors.startSymbol.message}
          </span>
        )}
        <Controller
          name="startSymbol"
          rules={{
            required: "Start symbol is required.",
          }}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Choose NonTerminal" />
              </SelectTrigger>
              <SelectContent>
                {nonTerminals.map((nt) => (
                  <SelectItem key={nt} value={nt}>
                    {nt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormItem>

      {/*
        5) Rust/wasm メソッドの引数用
           - forNullable: string[]
           - forFirstSet: string[]
           - forFollowSet: string (Select)
           - forDirectorSet: string (Select)
      */}
      <FormItem>
        <Label>forNullable: string[]</Label>
        <Controller
          name="forNullable"
          control={control}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormItem>

      <FormItem>
        <Label>forFirstSet: string[]</Label>
        <Controller
          name="forFirstSet"
          control={control}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormItem>

      <FormItem>
        <Label>forFollowSet: string (Select)</Label>
        <Controller
          name="forFollowSet"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="(not selected)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="__none__" value="__none__">
                  (not selected)
                </SelectItem>
                {nonTerminals.map((nt) => (
                  <SelectItem key={nt} value={nt}>
                    {nt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormItem>

      <FormItem>
        <Label>forDirectorSet: string (Select)</Label>
        <Controller
          name="forDirectorSet"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="(not selected)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="__none__" value="__none__">
                  (not selected)
                </SelectItem>
                {nonTerminals.map((nt) => (
                  <SelectItem key={nt} value={nt}>
                    {nt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormItem>

      <Button type="submit" className="mt-4 bg-blue-500 px-4 py-2 text-white">
        Submit
      </Button>

      {/*
        送信後のフォーム全体データ (デバッグ表示)
      */}
      {formData && (
        <pre className="mt-4 rounded border p-2">
          {JSON.stringify(formData, null, 2)}
        </pre>
      )}

      {/*
        Rust/wasm メソッド結果の表示
        (入力値もあわせて1つのテーブルで見られる形に)
      */}
      {wasmResults && (
        <div className="mt-4 space-y-4 rounded border p-2">
          <Table>
            <TableCaption>
              Rust/wasm メソッド実行結果 (入力値と出力の対応)
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/6">Target</TableHead>
                <TableHead className="w-1/6">Input</TableHead>
                <TableHead className="w-4/6">Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Row1: isELL1 (入力なし) */}
              <TableRow>
                <TableCell>isELL(1)</TableCell>
                <TableCell>N/A</TableCell>
                <TableCell>{String(wasmResults.isELL1)}</TableCell>
              </TableRow>

              {/* Row2: forNullable */}
              <TableRow>
                <TableCell>Nullable</TableCell>
                <TableCell>
                  {/* Badge表示: NullableのInput */}
                  {formData?.forNullable
                    ? renderBadges(formData.forNullable)
                    : "empty string"}
                </TableCell>
                <TableCell>
                  {/* boolean を String(...) 化 */}
                  {String(wasmResults.isNullable)}
                </TableCell>
              </TableRow>

              {/* Row3: forFirstSet */}
              <TableRow>
                <TableCell>FirstSet</TableCell>
                <TableCell>
                  {/* Badge表示: FirstSetのInput */}
                  {formData?.forFirstSet
                    ? renderBadges(formData.forFirstSet)
                    : null}
                </TableCell>
                <TableCell>
                  {/* Badge表示: wasmResults.firstSet */}
                  {renderBadges(wasmResults.firstSet, true)}
                </TableCell>
              </TableRow>

              {/* Row4: forFollowSet */}
              <TableRow>
                <TableCell>FollowSet</TableCell>
                <TableCell>
                  {formData?.forFollowSet === "__none__"
                    ? "(not selected)"
                    : renderBadges([formData?.forFollowSet || ""])}
                </TableCell>
                <TableCell>
                  {/* Badge表示: wasmResults.followSet */}
                  {renderBadges(wasmResults.followSet, true)}
                </TableCell>
              </TableRow>

              {/* Row5: directorSet → subtable for the output */}
              <TableRow>
                <TableCell>DirectorSet</TableCell>
                <TableCell>
                  {formData?.forDirectorSet === "__none__"
                    ? "(not selected)"
                    : renderBadges([formData?.forDirectorSet || ""])}
                </TableCell>
                <TableCell>
                  {wasmResults.directorEntries.length === 0 ? (
                    <div>(empty or not selected)</div>
                  ) : (
                    <Table>
                      <TableCaption>
                        directorSet (Map&lt;string[], string[]&gt;)
                      </TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>RHS</TableHead>
                          <TableHead>Result Set</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wasmResults.directorEntries.map(([k, v], i) => (
                          <TableRow key={i}>
                            {/* 変更点: k, v を Badge 表示 */}
                            <TableCell>{renderBadges(k)}</TableCell>
                            <TableCell>{renderBadges(v, true)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </form>
  );
}

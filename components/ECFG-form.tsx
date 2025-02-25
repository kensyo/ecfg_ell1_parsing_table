"use client";

import { useEffect, useState } from "react";
import {
  FieldErrors,
  useFieldArray,
  Controller,
  useWatch,
  useFormContext,
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

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ECFG } from "./core-contents";

// -------------------------------------
// 型定義
// -------------------------------------

type WasmResults = {
  isELL1: boolean;
  isNullable: boolean;
  firstSet: string[];
  followSet: string[];
  directorEntries: Array<[string[], string[]]>; // ディレクタセット (キー配列, 値配列)
};

const SPECIAL_STR = ["\\|", "\\(", "\\)", "\\{", "\\}"];

/**
 * Badge表示のためのヘルパー
 */
function renderBadges(items: string[], asSet: boolean = false) {
  return (
    <>
      {items.length !== 0 ? (
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
  } = useFormContext<ECFG>();

  const [formData, setFormData] = useState<ECFG | null>(null);
  const [wasmResults, setWasmResults] = useState<WasmResults | null>(null);

  // Field Array
  const { fields, append, remove } = useFieldArray({
    name: "productions",
    control,
  });

  // useWatch
  const productions = useWatch({ control, name: "productions" });
  const nonTerminals = useWatch({ control, name: "nonTerminals" }) || [];

  // -------------------------------------
  // productions 変化時に NonTerminals & Terminals を再計算
  // -------------------------------------
  useEffect(() => {
    if (!productions) return;
    const lhsSet = new Set<string>();
    productions.forEach((p) => {
      if (p.lhs) lhsSet.add(p.lhs);
    });
    setValue("nonTerminals", Array.from(lhsSet));

    const specialTokens = new Set(["\\{", "\\}", "\\|", "\\(", "\\)"]);
    const allSymbols = new Set<string>();
    productions.forEach((p) => {
      if (p.lhs) allSymbols.add(p.lhs);
      p.rhs.forEach((sym) => allSymbols.add(sym));
    });

    for (const nt of lhsSet) allSymbols.delete(nt);
    for (const st of specialTokens) allSymbols.delete(st);
    setValue("terminals", Array.from(allSymbols));
  }, [productions, setValue]);

  // -------------------------------------
  // フォーム送信
  // -------------------------------------
  const onValid = (data: ECFG) => {
    setFormData(data);

    const ecfg = new ECFGWrapper(
      data.terminals,
      data.nonTerminals,
      data.productions,
      data.startSymbol,
    );
    const isELL1 = ecfg.is_ell1();
    const isNullable = ecfg.calculate_nullable(data.forNullable);
    const firstSetRaw = ecfg.calculate_first_set(data.forFirstSet);

    let followSetRaw: string[] = [];
    if (data.forFollowSet !== "__none__") {
      followSetRaw = ecfg.calculate_follow_set(data.forFollowSet);
    }

    let directorMap: Map<string[], string[]> = new Map();
    if (data.forDirectorSet !== "__none__") {
      directorMap = ecfg.calculate_director_set(data.forDirectorSet);
    }

    let directorEntries: Array<[string[], string[]]> = [];
    if (directorMap && typeof directorMap.entries === "function") {
      directorEntries = Array.from(directorMap.entries());
    }

    console.log({
      isELL1,
      isNullable,
      firstSetRaw,
      followSetRaw,
      directorMap,
    });

    setWasmResults({
      isELL1,
      isNullable,
      firstSet: firstSetRaw,
      followSet: followSetRaw,
      directorEntries,
    });
  };
  const onInvalid = (errs: FieldErrors<ECFG>) => {
    console.error("Validation errors:", errs);
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
            The symbol in LHS must not be empty.
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
              variant="destructive"
            >
              Remove
            </Button>
          </div>
        ))}

        <Button
          type="button"
          onClick={() => append({ lhs: "", rhs: [] })}
          variant="default"
        >
          Add Production
        </Button>
      </FormItem>

      {/* 4) Start symbol */}
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
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-[220px]">
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

      <hr />

      {/* 5) forNullable, forFirstSet, forFollowSet, forDirectorSet */}
      <FormItem>
        <Label>For nullable</Label>
        {errors.forNullable && (
          <span className="px-2 text-sm text-red-500">
            {errors.forNullable.message}
          </span>
        )}
        <Controller
          name="forNullable"
          control={control}
          rules={{
            validate: (vals, { nonTerminals, terminals }) => {
              for (const symbol of vals) {
                if (
                  !(
                    nonTerminals.includes(symbol) ||
                    terminals.includes(symbol) ||
                    SPECIAL_STR.includes(symbol)
                  )
                ) {
                  return `"${symbol}" is neither a terminal nor a non terminal.`;
                }
              }
              return true;
            },
          }}
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
        <Label>For first set</Label>
        {errors.forFirstSet && (
          <span className="px-2 text-sm text-red-500">
            {errors.forFirstSet.message}
          </span>
        )}
        <Controller
          name="forFirstSet"
          control={control}
          rules={{
            validate: (vals, { nonTerminals, terminals }) => {
              for (const symbol of vals) {
                if (
                  !(
                    nonTerminals.includes(symbol) ||
                    terminals.includes(symbol) ||
                    SPECIAL_STR.includes(symbol)
                  )
                ) {
                  return `"${symbol}" is neither a terminal nor a non terminal.`;
                }
              }
              return true;
            },
          }}
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
        <Label>For follow set</Label>
        <Controller
          name="forFollowSet"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
        <Label>For director set</Label>
        <Controller
          name="forDirectorSet"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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

      {/* Submit */}
      <Button type="submit" className="mt-4 bg-blue-500 px-4 py-2 text-white">
        Submit
      </Button>

      {/* 送信後のフォームデータ (デバッグ表示) */}
      {/* {formData && ( */}
      {/*   <pre className="mt-4 rounded border p-2"> */}
      {/*     {JSON.stringify(formData, null, 2)} */}
      {/*   </pre> */}
      {/* )} */}

      {/* Rust/wasm結果 */}
      {wasmResults && (
        <div className="mt-4 space-y-4 rounded border p-2">
          <Table>
            <TableCaption>Result</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/6">Target</TableHead>
                <TableHead className="w-1/6">Input</TableHead>
                <TableHead className="w-4/6">Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Row1: isELL1 */}
              <TableRow>
                <TableCell>isELL(1)</TableCell>
                <TableCell>N/A</TableCell>
                <TableCell>{String(wasmResults.isELL1)}</TableCell>
              </TableRow>

              {/* Row2: forNullable */}
              <TableRow>
                <TableCell>Nullable</TableCell>
                <TableCell>
                  {formData?.forNullable
                    ? renderBadges(formData.forNullable)
                    : "empty string"}
                </TableCell>
                <TableCell>{String(wasmResults.isNullable)}</TableCell>
              </TableRow>

              {/* Row3: forFirstSet */}
              <TableRow>
                <TableCell>FirstSet</TableCell>
                <TableCell>
                  {formData?.forFirstSet
                    ? renderBadges(formData.forFirstSet)
                    : null}
                </TableCell>
                <TableCell>
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
                  {formData?.forFollowSet === "__none__" ? (
                    <p>N/A</p>
                  ) : (
                    renderBadges(wasmResults.followSet, true)
                  )}
                </TableCell>
              </TableRow>

              {/* Row5: directorSet */}
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
                      <TableHeader>
                        <TableRow>
                          <TableHead>RHS</TableHead>
                          <TableHead>Set</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wasmResults.directorEntries.map(([k, v], i) => (
                          <TableRow key={i}>
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

"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AutoResizeInput from "../auto-resize-input";

type InputProps = React.ComponentProps<"input">;

type InputTagsProps = Omit<InputProps, "value" | "onChange"> & {
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
};

/**
 * タグを自由な位置に追加できる InputTags コンポーネント
 * - Enter でタグ追加 & 入力欄リセット
 * - Backspace で空欄時に前のタグを削除
 * - 左端で ← を押すと前の入力欄へ / 右端で → を押すと次の入力欄へ
 */
const InputTags = React.forwardRef<HTMLInputElement, InputTagsProps>(
  ({ className, value, onChange, ...props }, forwardedRef) => {
    // 各入力欄の文字列を保管する（タグの数 + 1 個）
    const [inputValues, setInputValues] = React.useState<string[]>(() =>
      Array(value.length + 1).fill(""),
    );

    // タグ表示用キー配列（タグ削除等でインデックスが変わるのに対応）
    const [keys, setKeys] = React.useState<string[]>(() =>
      value.map(() => `${Date.now()}-${Math.random()}`),
    );

    /**
     * すべての入力欄にアクセスするための ref 配列
     * - たとえば inputRefs.current[i] が「i番目の入力欄の <input>」を指す
     */
    const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

    // ref を設定する際のヘルパー
    // (forwardedRef は最初の input に使い、ついでに自前配列にも登録する)
    const setInputRef = (el: HTMLInputElement | null, i: number) => {
      // i番目の input 要素を配列にセット
      inputRefs.current[i] = el;
      // もし i===0 で、外部からの forwardedRef があればそこにもセット
      if (i === 0 && typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (i === 0 && forwardedRef && "current" in forwardedRef) {
        // useRef 形式の場合
        (
          forwardedRef as React.MutableRefObject<HTMLInputElement | null>
        ).current = el;
      }
    };

    /**
     * 外部で value が変化したとき、keys や inputValues と整合性を合わせる
     */
    React.useEffect(() => {
      // タグが増えた
      if (value.length > keys.length) {
        const diff = value.length - keys.length;
        setKeys((oldKeys) => {
          const newKeys = [...oldKeys];
          for (let i = 0; i < diff; i++) {
            newKeys.push(`${Date.now()}-${Math.random()}`);
          }
          return newKeys;
        });
        setInputValues((oldValues) => [...oldValues, ...Array(diff).fill("")]);
      }
      // タグが減った
      else if (value.length < keys.length) {
        setKeys((oldKeys) => oldKeys.slice(0, value.length));
        setInputValues((oldValues) => oldValues.slice(0, value.length + 1));
      }
      // タグ数に変化がない場合は何もしない
    }, [value, keys]);

    /**
     * 指定インデックスにタグを挿入
     */
    const addTagAtIndex = (tag: string, index: number) => {
      if (!tag) return;
      // タグ配列に挿入
      const newValue = [...value.slice(0, index), tag, ...value.slice(index)];
      onChange(newValue);

      // キー配列にも挿入
      setKeys((oldKeys) => [
        ...oldKeys.slice(0, index),
        `${Date.now()}-${Math.random()}`,
        ...oldKeys.slice(index),
      ]);

      // inputValues にも空文字挿入（index の位置）
      setInputValues((oldValues) => {
        const copy = [...oldValues];
        copy.splice(index, 0, "");
        return copy;
      });
    };

    /**
     * 指定インデックスのタグを削除
     */
    const removeTag = (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);

      setKeys((oldKeys) => oldKeys.filter((_, i) => i !== index));
      setInputValues((oldValues) => {
        const copy = [...oldValues];
        copy.splice(index, 1);
        return copy;
      });
    };

    /**
     * 入力欄の onKeyDown
     */
    const handleKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      index: number,
    ) => {
      const currentValue = inputValues[index];
      const selectionStart = e.currentTarget.selectionStart;
      const selectionEnd = e.currentTarget.selectionEnd;
      if (selectionStart == null || selectionEnd == null) return;

      // Enter でタグを追加
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = currentValue.trim();
        if (trimmed !== "") {
          addTagAtIndex(trimmed, index);
          // 追加後に index+1 が空欄になるため、そこを空にしてリセット
          setInputValues((oldValues) => {
            const copy = [...oldValues];
            if (index + 1 < copy.length) {
              copy[index + 1] = "";
            }
            return copy;
          });
        }
        return;
      }

      // Backspace: 入力欄が空なら前のタグを削除
      if (
        e.key === "Backspace" &&
        currentValue.length === 0 &&
        value.length > 0
      ) {
        if (index > 0) {
          e.preventDefault();
          removeTag(index - 1);
        }
        return;
      }

      // ← 左キー: 左端にいる場合は前の入力欄の末尾へ
      if (
        e.key === "ArrowLeft" &&
        selectionStart === 0 &&
        selectionEnd === 0 &&
        index > 0
      ) {
        e.preventDefault();
        const prevInput = inputRefs.current[index - 1];
        if (prevInput) {
          prevInput.focus();
          // prevInput の末尾にキャレットを移動
          const len = inputValues[index - 1].length;
          prevInput.setSelectionRange(len, len);
        }
        return;
      }

      // → 右キー: 右端にいる場合は次の入力欄の先頭へ
      if (
        e.key === "ArrowRight" &&
        selectionStart === currentValue.length &&
        selectionEnd === currentValue.length &&
        index < inputValues.length - 1
      ) {
        e.preventDefault();
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
          // nextInput の先頭にキャレットを移動
          nextInput.setSelectionRange(0, 0);
        }
        return;
      }
    };

    /**
     * 入力欄の onChange
     */
    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      index: number,
    ) => {
      const inputVal = e.target.value;
      setInputValues((oldValues) => {
        const copy = [...oldValues];
        copy[index] = inputVal;
        return copy;
      });
    };

    return (
      <div
        className={cn(
          "min-h-10 flex w-full flex-wrap gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950",
          className,
        )}
      >
        {value.map((tag, i) => (
          <React.Fragment key={keys[i]}>
            {/** タグ i を追加する直前の入力欄 */}
            <AutoResizeInput
              defaultWidth={2}
              ref={(el) => setInputRef(el, i)} // ref 配列 & forwardedRef
              className="outline-none placeholder:text-neutral-500 dark:bg-neutral-950 dark:placeholder:text-neutral-400"
              value={inputValues[i] ?? ""}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              {...props}
            />

            {/** タグ表示 */}
            <Badge variant="secondary" className="flex items-center">
              {tag}
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 size-3"
                onClick={() => removeTag(i)}
              >
                <XIcon className="w-3" />
              </Button>
            </Badge>
          </React.Fragment>
        ))}

        {/** タグ配列の末尾に表示する入力欄 */}
        <input
          ref={(el) => setInputRef(el, value.length)}
          className="flex-1 outline-none placeholder:text-neutral-500 dark:bg-neutral-950 dark:placeholder:text-neutral-400"
          value={inputValues[value.length] ?? ""}
          onChange={(e) => handleChange(e, value.length)}
          onKeyDown={(e) => handleKeyDown(e, value.length)}
          {...props}
        />
      </div>
    );
  },
);

InputTags.displayName = "InputTags";

export { InputTags };

"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input">;

type InputTagsProps = Omit<InputProps, "value" | "onChange"> & {
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
};

/**
 * タグを自由な位置に追加できる InputTags コンポーネント
 * - Enter でタグ追加 & 入力欄リセット
 * - Backspace で【カーソルが先頭】なら前のタグを削除
 * - 矢印キーで左右の入力欄に移動
 */
const InputTags = React.forwardRef<HTMLInputElement, InputTagsProps>(
  ({ className, value, onChange, ...props }, forwardedRef) => {
    // 各入力欄の文字列を保管する（タグ数 + 1 個）
    const [inputValues, setInputValues] = React.useState<string[]>(() =>
      Array(value.length + 1).fill(""),
    );

    // タグ表示用キー配列
    const [keys, setKeys] = React.useState<string[]>(() =>
      value.map(() => `${Date.now()}-${Math.random()}`),
    );

    // すべての入力欄を参照管理する
    const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

    // ref を設定する際のヘルパー
    const setInputRef = (el: HTMLInputElement | null, i: number) => {
      inputRefs.current[i] = el;
      // forwardedRef は一番最初の input にだけ割り当てる（お好みで）
      if (i === 0 && typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (i === 0 && forwardedRef && "current" in forwardedRef) {
        (
          forwardedRef as React.MutableRefObject<HTMLInputElement | null>
        ).current = el;
      }
    };

    /**
     * 外部で value が変化したとき、keys や inputValues の整合性を合わせる
     */
    React.useEffect(() => {
      if (value.length > keys.length) {
        // タグが増えた
        const diff = value.length - keys.length;
        setKeys((oldKeys) => {
          const newKeys = [...oldKeys];
          for (let i = 0; i < diff; i++) {
            newKeys.push(`${Date.now()}-${Math.random()}`);
          }
          return newKeys;
        });
        setInputValues((oldValues) => [...oldValues, ...Array(diff).fill("")]);
      } else if (value.length < keys.length) {
        // タグが減った
        setKeys((oldKeys) => oldKeys.slice(0, value.length));
        setInputValues((oldValues) => oldValues.slice(0, value.length + 1));
      }
      // タグ数が変わっていないなら何もしない
    }, [value, keys]);

    /**
     * 指定インデックスにタグを挿入
     */
    const addTagAtIndex = (tag: string, index: number) => {
      if (!tag) return;
      // タグ追加
      const newValue = [...value.slice(0, index), tag, ...value.slice(index)];
      onChange(newValue);

      // キーを挿入
      setKeys((oldKeys) => [
        ...oldKeys.slice(0, index),
        `${Date.now()}-${Math.random()}`,
        ...oldKeys.slice(index),
      ]);

      // inputValues にも空欄を挿入
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
        // タグ i を削除したら「i+1番目の入力欄」を削除
        const removeIndex = index + 1;
        if (removeIndex < copy.length) {
          copy.splice(removeIndex, 1);
        } else {
          // 末尾タグなら最後の要素を削除
          copy.pop();
        }
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

      // Enter でタグ追加
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = currentValue.trim();
        if (trimmed !== "") {
          addTagAtIndex(trimmed, index);
          // 追加後に index+1 が空欄になるためリセット
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

      // Backspace: カーソルが先頭にあれば前のタグを削除
      if (
        e.key === "Backspace" &&
        index > 0 &&
        selectionStart === 0 &&
        selectionEnd === 0
      ) {
        e.preventDefault();
        removeTag(index - 1);
        return;
      }

      // ← 左キー: 左端なら前の入力欄末尾へ
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
          const len = inputValues[index - 1].length;
          prevInput.setSelectionRange(len, len);
        }
        return;
      }

      // → 右キー: 右端なら次の入力欄先頭へ
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
            {/** タグ i の直前の入力欄 */}
            <input
              ref={(el) => setInputRef(el, i)}
              className="flex-1 outline-none placeholder:text-neutral-500 dark:bg-neutral-950 dark:placeholder:text-neutral-400"
              value={inputValues[i] ?? ""}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              {...props}
            />

            {/** タグ */}
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

        {/** 最後にもうひとつ入力欄 */}
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

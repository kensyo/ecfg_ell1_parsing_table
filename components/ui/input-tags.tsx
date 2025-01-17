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
 * - Enter でタグ追加 & 入力欄リセット (ただしIME変換中は除外)
 * - Backspace でカーソルが先頭なら前のタグ削除
 * - 矢印キーで左右の入力欄に移動
 * - 日本語IME変換中のEnterを除外
 */
const InputTags = React.forwardRef<HTMLInputElement, InputTagsProps>(
  ({ className, value, onChange, ...props }, forwardedRef) => {
    // 各入力欄の文字列
    const [inputValues, setInputValues] = React.useState<string[]>(() =>
      Array(value.length + 1).fill(""),
    );

    // タグ表示用のキー
    const [keys, setKeys] = React.useState<string[]>(() =>
      value.map(() => `${Date.now()}-${Math.random()}`),
    );

    // 複数 input の ref 管理
    const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

    // ref を設定するヘルパー
    const setInputRef = (el: HTMLInputElement | null, i: number) => {
      inputRefs.current[i] = el;
      if (i === 0 && typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (i === 0 && forwardedRef && "current" in forwardedRef) {
        (forwardedRef as React.RefObject<HTMLInputElement | null>).current = el;
      }
    };

    // 「IME入力中かどうか」を管理
    const [isComposing, setIsComposing] = React.useState(false);

    // 外部で value が増減したときに keys, inputValues を同期
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
    }, [value, keys]);

    /**
     * タグを index に挿入
     */
    const addTagAtIndex = (tag: string, index: number) => {
      if (!tag) return;
      // タグ配列に挿入
      const newValue = [...value.slice(0, index), tag, ...value.slice(index)];
      onChange(newValue);

      // key も挿入
      setKeys((oldKeys) => [
        ...oldKeys.slice(0, index),
        `${Date.now()}-${Math.random()}`,
        ...oldKeys.slice(index),
      ]);

      // inputValues にも空欄を1つ追加
      setInputValues((oldValues) => {
        const copy = [...oldValues];
        copy.splice(index, 0, "");
        return copy;
      });
    };

    /**
     * タグを index で削除
     */
    const removeTag = (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);

      setKeys((oldKeys) => oldKeys.filter((_, i) => i !== index));
      setInputValues((oldValues) => {
        const copy = [...oldValues];
        // タグ i を削除したので、i+1 の入力欄を削除
        const removeIndex = index + 1;
        if (removeIndex < copy.length) {
          copy.splice(removeIndex, 1);
        } else {
          // 末尾タグなら pop で削除
          copy.pop();
        }
        return copy;
      });
    };

    /**
     * キー操作
     */
    const handleKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      index: number,
    ) => {
      const currentValue = inputValues[index];
      const selectionStart = e.currentTarget.selectionStart;
      const selectionEnd = e.currentTarget.selectionEnd;
      if (selectionStart == null || selectionEnd == null) return;

      // Enter: IME変換中でなければタグを追加
      if (e.key === "Enter" && !isComposing) {
        e.preventDefault();
        const trimmed = currentValue.trim();
        if (trimmed !== "") {
          addTagAtIndex(trimmed, index);
          // 追加直後、index+1 が空欄なのでリセット
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

      // Backspace: カーソルが先頭なら前のタグを削除
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

      // ← 左キー: 左端なら前の入力末尾へ
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

      // → 右キー: 右端なら次の入力先頭へ
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
     * 入力変更
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

    /**
     * IME開始/終了ハンドラ
     */
    const handleCompositionStart = () => {
      setIsComposing(true);
    };
    const handleCompositionEnd = () => {
      setIsComposing(false);
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
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
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

        {/** 配列末尾の入力欄 */}
        <input
          ref={(el) => setInputRef(el, value.length)}
          className="flex-1 outline-none placeholder:text-neutral-500 dark:bg-neutral-950 dark:placeholder:text-neutral-400"
          value={inputValues[value.length] ?? ""}
          onChange={(e) => handleChange(e, value.length)}
          onKeyDown={(e) => handleKeyDown(e, value.length)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          {...props}
        />
      </div>
    );
  },
);

InputTags.displayName = "InputTags";

export { InputTags };

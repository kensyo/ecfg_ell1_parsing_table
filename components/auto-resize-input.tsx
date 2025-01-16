import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
} from "react";

type ResizableInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const YOHAKU = 0;
const DEFAULT_W = 15;

const AutoResizeInput = forwardRef<HTMLInputElement, ResizableInputProps>(
  (props, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputWidth, setInputWidth] = useState(DEFAULT_W);

    const updateWidth = useCallback(() => {
      if (inputRef.current) {
        const tempSpan = document.createElement("span");
        tempSpan.style.visibility = "hidden";
        tempSpan.style.whiteSpace = "pre";
        tempSpan.style.font = getComputedStyle(inputRef.current).font;
        tempSpan.textContent =
          inputRef.current.value || props.placeholder || "";

        document.body.appendChild(tempSpan);
        const textWidth = tempSpan.offsetWidth + YOHAKU;
        document.body.removeChild(tempSpan);

        setInputWidth(Math.max(DEFAULT_W, textWidth));
      }
    }, [props.placeholder]);

    useEffect(() => {
      updateWidth();
    }, [props.value, updateWidth]);

    const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (
      e,
    ) => {
      if (props.onChange) props.onChange(e);
      updateWidth();
    };

    return (
      <input
        {...props}
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLInputElement | null>).current =
              node;
          }
        }}
        style={{
          ...props.style,
          width: `${inputWidth}px`,
        }}
        onChange={handleInputChange}
      />
    );
  },
);

AutoResizeInput.displayName = "AutoResizeInput";

export default AutoResizeInput;

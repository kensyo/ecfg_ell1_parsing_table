"use client";
import Test from "./test";
import ECFGForm from "@/components/ECFG-form";
import { CustomizedInputTags } from "@/components/ui/customized-input-tags";
import { useState } from "react";

export default function MainContents() {
  const [values, setValues] = useState<string[]>([]);
  return (
    <div>
      <Test />
      <ECFGForm />
      <p>{values.join(", ")}</p>
      <CustomizedInputTags
        maxTags={3}
        value={values}
        onChange={(data) => {
          setValues(data);
        }}
        className="max-w-[1000px]"
      />
    </div>
  );
}

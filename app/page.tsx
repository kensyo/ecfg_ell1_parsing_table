"use client";
import AutoResizeInput from "@/components/auto-resize-input";
import ECFGForm from "@/components/ECFG-form";
import { CustomizedInputTags } from "@/components/ui/customized-input-tags";
import { useState } from "react";

export default function Home() {
  const [values, setValues] = useState<string[]>([]);
  return (
    <main className="container p-6">
      <ECFGForm />
      <p>{values.join(", ")}</p>
      <CustomizedInputTags
        value={values}
        onChange={setValues}
        // placeholder="Enter values, comma separated..."
        className="max-w-[500px]"
      />
      <AutoResizeInput onChange={(data) => console.log(data)} />
    </main>
  );
}

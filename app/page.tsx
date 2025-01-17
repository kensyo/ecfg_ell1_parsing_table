"use client";
import ECFGForm from "@/components/ECFG-form";
import { CustomizedInputTags } from "@/components/ui/customized-input-tags";
import { InputTags } from "@/components/ui/input-tags";
import { useState } from "react";

export default function Home() {
  const [values, setValues] = useState<string[]>([]);
  return (
    <main className="container p-6">
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
    </main>
  );
}

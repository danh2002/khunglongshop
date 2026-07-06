"use client";

import dynamic from "next/dynamic";

const BlindBoxPoolEditor = dynamic(() => import("@/components/admin/BlindBoxPoolEditor"), {
  ssr: false,
  loading: () => <div className="min-h-[220px]" />,
});

type BlindBoxPoolEditorClientProps = {
  collectorSetId: string;
};

export default function BlindBoxPoolEditorClient({ collectorSetId }: BlindBoxPoolEditorClientProps) {
  return <BlindBoxPoolEditor collectorSetId={collectorSetId} />;
}

"use client";

import dynamic from "next/dynamic";

const MainContent = dynamic(() => import("@/app/main-content").then((m) => m.MainContent), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-neutral-50">
      <div className="text-neutral-500">Loading...</div>
    </div>
  ),
});

interface ClientMainContentProps {
  user?: {
    id: string;
    email: string;
  } | null;
  project?: {
    id: string;
    name: string;
    messages: any[];
    data: any;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function ClientMainContent(props: ClientMainContentProps) {
  return <MainContent {...props} />;
}

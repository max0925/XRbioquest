"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Redirect /create-lesson to /environment-design
export default function CreateLessonRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/environment-design");
  }, [router]);

  return (
    <div className="h-screen w-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-sm text-gray-500" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
          Redirecting...
        </p>
      </div>
    </div>
  );
}

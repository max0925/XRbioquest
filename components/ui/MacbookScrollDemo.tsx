import React from "react";
import { MacbookScroll } from "@/components/ui/macbook-scroll";

export function MacbookScrollDemo() {
  return (
    <div className="w-full overflow-hidden bg-white dark:bg-[#0B0B0F]">
      <MacbookScroll
        title={
          <>
            <span>Bring Ideas to Life with </span>
            <span className="text-green-600">AI & XR</span>
          </>
        }
        src="/macbook.png"
        showGradient={false}
      />
    </div>
  );
}

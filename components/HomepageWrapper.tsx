"use client";

import dynamic from "next/dynamic";

// ✅ 动态导入 HomepageSections
const HomepageSections = dynamic(() => import("./HomepageSections"), {
  ssr: false,
});

export default function HomepageWrapper() {
  console.log("✅ HomepageWrapper loaded");
  return <HomepageSections />;
}

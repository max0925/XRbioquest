"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface MacbookScrollProps {
  title?: React.ReactNode;
  src: string;
  badge?: React.ReactNode;
  showGradient?: boolean;
}

export function MacbookScroll({
  title,
  src,
  badge,
  showGradient = true,
}: MacbookScrollProps) {
  // 滚动联动
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <section
      className={cn(
        // ✅ 背景透明、无阴影、无模糊
        "relative flex flex-col items-center justify-center w-full py-20 overflow-hidden bg-transparent"
      )}
    >
      {/* ✅ 删除白色渐变层 */}
      {showGradient && <div className="absolute inset-0 pointer-events-none z-10" />}

      {/* Title Section */}
      <motion.div
        style={{ y }}
        className="text-center max-w-2xl z-20 mt-8 mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
          {title}
        </h2>
        {badge && <div className="mt-4 flex justify-center">{badge}</div>}
      </motion.div>

      {/* ✅ MacBook mockup 图片：完全透明、无阴影 */}
      <motion.div
        style={{ y }}
        className="relative w-full max-w-4xl overflow-visible bg-transparent shadow-none border-none rounded-none"
      >
        <div className="relative w-full h-auto flex justify-center items-center bg-transparent">
          <Image
            src={src}
            alt="Macbook"
            width={1200}  // ✅ 固定宽高避免 Next.js 自动加白底
            height={700}
            priority
            className="object-contain bg-transparent shadow-none border-none rounded-none pointer-events-none select-none"
            style={{
              backgroundColor: "transparent",
              boxShadow: "none",
              filter: "none",
            }}
          />
        </div>
      </motion.div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function MarketPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 4;

  const categories = ["All", "Biology", "Physics", "Chemistry", "Earth Science", "AI & Coding"];

  const allItems = [
    {
      title: "AI & Society Challenge Pack",
      author: "EdTechMaker",
      category: "AI & Coding",
      price: "$3.99",
      image: "/market2.png",
      rating: 5,
    },
    {
      title: "Biology Escape Lab (VR)",
      author: "BioQuest Team",
      category: "Biology",
      price: "Free",
      image: "/market3.png",
      rating: 4,
    },
    {
      title: "Ecosystem Builder Game",
      author: "NatureMind",
      category: "Earth Science",
      price: "$1.99",
      image: "/market4.png",
      rating: 3,
    },
    {
      title: "Force & Motion Simulation",
      author: "Dr. Amanda Cottone",
      category: "Physics",
      price: "Free",
      image: "/market1.png",
      rating: 4,
    },
    {
      title: "AI Tutor Assistant for Students",
      author: "InnovEd",
      category: "AI & Coding",
      price: "$2.99",
      image: "/market5.png",
      rating: 5,
    },
    {
      title: "Plant Growth Lab (AR)",
      author: "EduVR Studio",
      category: "Biology",
      price: "Free",
      image: "/market6.png",
      rating: 4,
    },
  ];

  // 搜索 + 分类过滤
  const filteredItems = allItems.filter(
    (item) =>
      (activeCategory === "All" || item.category === activeCategory) &&
      (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 分页逻辑
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const nextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-[80px] px-6 pb-20">
      {/* ✅ 标题区 */}
      <div className="max-w-6xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          BioQuest Market
        </h1>
        <p className="text-gray-500 text-base">
          Discover teacher-created AR/VR lessons, simulations, and AI learning tools.
        </p>
      </div>

      {/* ✅ 搜索 + 分类 */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-1/2 bg-white border border-gray-200 rounded-full px-5 py-2 shadow-sm">
          <Search className="text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search lessons, authors, or topics..."
            className="flex-grow bg-transparent outline-none text-gray-700 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === cat
                  ? "bg-green-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-green-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ✅ 横版作品列表 */}
      <div className="max-w-6xl mx-auto flex flex-col divide-y divide-gray-200 bg-white rounded-2xl border border-gray-100 shadow-sm">
        {currentItems.length > 0 ? (
          currentItems.map((item, i) => (
            <div
              key={i}
              className="flex flex-col md:flex-row items-center gap-5 p-5 hover:bg-gray-50 transition"
            >
              {/* 图片 */}
              <div className="w-full md:w-48 h-32 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={300}
                  height={200}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 信息 */}
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 mb-1">By {item.author}</p>
                <p className="text-sm text-gray-600 mb-2">{item.category}</p>

                {/* 星级评分 */}
                <div className="flex items-center mt-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={index}
                      className={`text-sm ${
                        index < item.rating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* 价格 */}
              <div className="text-right md:min-w-[90px] mt-3 md:mt-0">
                {item.price === "Free" ? (
                  <span className="text-green-600 font-semibold text-base">
                    {item.price}
                  </span>
                ) : (
                  <span className="text-blue-600 font-semibold text-base">
                    {item.price}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-10">
            No items found.
          </p>
        )}
      </div>

      {/* ✅ 翻页 */}
      {filteredItems.length > itemsPerPage && (
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            onClick={prevPage}
            disabled={page === 1}
            className={`p-2 rounded-full border ${
              page === 1
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 border-gray-300"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={nextPage}
            disabled={page === totalPages}
            className={`p-2 rounded-full border ${
              page === totalPages
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 border-gray-300"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

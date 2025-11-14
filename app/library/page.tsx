"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import Image from "next/image";

export default function LibraryPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Biology", "Physics", "Chemistry", "Earth Science", "AI & Coding"];
  const grades = ["Elementary", "Middle School", "High School"];

  const courses = [
    {
      title: "The Water Cycle Adventure (VR)",
      image: "/watercycle.png",
      author: "Zheng Bian & Dr. Susan Yoon",
      tags: ["Biology", "Grade 5–8", "Free"],
    },
    {
      title: "Forces and Motion with AI Simulation",
      image: "/force.jpg",
      author: "Dr. Amanda Cottone",
      tags: ["Physics", "High School"],
    },
    {
      title: "AI & Society: Understanding Human Bias",
      image: "/gender.png",
      author: "Meerim Kanatova & Prof. Bodong Chen",
      tags: ["AI & Ethics", "High School", "Popular"],
    },
    {
      title: "Ecosystems in Action (AR Experience)",
      image: "/ecosystems.png",
      author: "BioQuest Team",
      tags: ["Biology", "Middle School"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-[70px] px-10">
      {/* 顶部搜索栏 */}
      <div className="max-w-6xl mx-auto py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-1/2 bg-white border border-gray-200 rounded-full px-5 py-2 shadow-sm">
          <Search className="text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search courses, topics, or professors..."
            className="flex-grow bg-transparent outline-none text-gray-700 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
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

      {/* 年级分类 */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-wrap gap-3 justify-center">
        {grades.map((grade) => (
          <span
            key={grade}
            className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm cursor-pointer hover:bg-green-100 hover:text-green-700 transition"
          >
            {grade}
          </span>
        ))}
      </div>

      {/* 课程展示区 */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-5">Featured Courses</h2>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 overflow-hidden"
            >
              <Image
                src={course.image}
                alt={course.title}
                width={500}
                height={280}
                className="h-48 w-full object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{course.author}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ 知名教育家合作：头像格式统一 */}
      <div className="max-w-6xl mx-auto mt-20 mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Courses Developed with Leading Educators
        </h2>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-10">
          {[
            {
              name: "Dr. Eleanor Hayes",
              subject: "Learning Innovation & Educational Leadership",
              image: "/professor1.png",
            },
            {
              name: "Prof. Daniel Mercer",
              subject: "STEM Education & Digital Pedagogy",
              image: "/professor2.png",
            },
            {
              name: "Dr. Sofia Alvarez",
              subject: "Cognitive Development & Instructional Design",
              image: "/professor3.png",
            },
          ].map((prof, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center hover:shadow-lg transition"
            >
              {/* ✅ 圆形头像尺寸一致，完美对齐 */}
              <div className="w-36 h-36 rounded-full overflow-hidden mb-5 shadow-md">
                <Image
                  src={prof.image}
                  alt={prof.name}
                  width={144}
                  height={144}
                  className="object-cover w-full h-full"
                />
              </div>

              <h3 className="font-semibold text-gray-900 text-lg">{prof.name}</h3>
              <p className="text-sm text-gray-500 mt-2">{prof.subject}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

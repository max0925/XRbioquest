"use client";

import { useState } from "react";
import { Users, MessageCircle, Settings, UserPlus, MapPin } from "lucide-react";
import Image from "next/image";

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState("contacts");

  const events = [
    {
      title: "Teachers' Happy Hour & Networking",
      date: "Fri, Nov 15 • 6:00 PM",
      location: "Philadelphia · Craft Hall",
      type: "Networking",
      image: "/happyhour.png", // ✅ 更新图片
      tag: "Free",
    },
    {
      title: "STEM Education Roundtable",
      date: "Sat, Nov 16 • 2:00 PM",
      location: "Penn GSE Innovation Center",
      type: "Roundtable",
      image: "/roundtable.png", // ✅ 更新图片
      tag: "Limited Seats",
    },
    {
      title: "Immersive Learning Exhibition",
      date: "Sun, Nov 17 • 1:00 PM",
      location: "Philadelphia · Science Center",
      type: "Exhibition",
      image: "/exhibition.png", // ✅ 更新图片
      tag: "Free",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 pt-[70px]">
      {/* 左侧：个人区 */}
      <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col justify-between fixed left-0 top-[70px] bottom-0 shadow-sm">
        <div>
          {/* 用户信息 */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/avatar.png"
              alt="User Avatar"
              width={80}
              height={80}
              className="rounded-full border border-gray-300 mb-3"
            />
            <h2 className="text-lg font-semibold text-gray-900">Zheng Bian</h2>
            <p className="text-xs text-gray-500 mb-2">Educator & Creator</p>
            <button className="text-sm text-green-600 font-medium hover:underline">
              Edit Profile
            </button>
          </div>

          {/* 菜单 */}
          <nav className="space-y-2">
            <button
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "contacts"
                  ? "bg-green-50 text-green-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("contacts")}
            >
              <Users size={16} />
              My Contacts
            </button>

            <button
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "groups"
                  ? "bg-green-50 text-green-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("groups")}
            >
              <UserPlus size={16} />
              My Groups
            </button>

            <button
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "messages"
                  ? "bg-green-50 text-green-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("messages")}
            >
              <MessageCircle size={16} />
              Messages
            </button>

            <button
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === "settings"
                  ? "bg-green-50 text-green-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("settings")}
            >
              <Settings size={16} />
              Settings
            </button>
          </nav>
        </div>

        <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
          <p>© 2025 BioQuest</p>
        </div>
      </aside>

      {/* 中间：活动展示区 */}
      <main className="flex-1 ml-72 p-10 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Events Around You
        </h1>
        <p className="text-gray-500 mb-8">
          Discover workshops, roundtables, and exhibitions happening near you.
        </p>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 overflow-hidden"
            >
              <Image
                src={event.image}
                alt={event.title}
                width={500}
                height={300}
                className="h-44 w-full object-cover"
              />
              <div className="p-4">
                <h2 className="text-[15px] font-semibold text-gray-900 mb-1">
                  {event.title}
                </h2>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin size={14} />
                  {event.location}
                </p>
                <p className="text-sm text-gray-500 mt-1">{event.date}</p>

                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {event.tag}
                  </span>
                  <span className="text-xs text-gray-400">{event.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

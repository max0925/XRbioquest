export default function WorkshopPage() {
    return (
      <div className="w-full flex flex-col items-center py-24 px-6 text-center">
  
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          BioQuest Workshop
        </h1>
  
        <p className="text-gray-600 text-lg mb-10 max-w-xl">
          Hands-on teacher workshops, interactive design sessions,  
          and AI-powered lesson building tools — launching soon.
        </p>
  
        <button
          disabled
          className="rounded-full bg-gray-900 text-white px-8 py-3 text-sm font-medium opacity-70 cursor-default"
        >
          Coming Soon
        </button>
  
        <div className="mt-12 text-sm text-gray-400">
          v1.0 launching Winter 2025
        </div>
  
      </div>
    );
  }
  
"use client";
import { useState } from 'react';
import Scene from './environment-design/Scene';

/**
 * Example component demonstrating AI Orchestrator integration
 * This shows how to connect the AI API to the 3D scene
 */
export default function OrchestratorExample() {
  const [aiState, setAiState] = useState({
    environment: 'default' as const,
    channel_state: 0.5
  });
  const [userMessage, setUserMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiReply, setAiReply] = useState('');

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();

      // Update the scene with AI response
      setAiState({
        environment: data.environment,
        channel_state: data.channel_state
      });

      setAiReply(data.reply);
      setUserMessage('');
    } catch (error) {
      console.error('Orchestrator error:', error);
      setAiReply('Error communicating with AI');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* 3D Scene */}
      <div className="flex-1">
        <Scene aiState={aiState} />
      </div>

      {/* Control Panel */}
      <div className="w-96 bg-gray-900 p-6 flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4">AI Orchestrator</h2>

        {/* Current State Display */}
        <div className="mb-4 p-3 bg-gray-800 rounded">
          <div className="text-sm text-gray-400">Environment</div>
          <div className="text-white font-mono">{aiState.environment}</div>
          <div className="text-sm text-gray-400 mt-2">Channel State</div>
          <div className="text-white font-mono">{aiState.channel_state.toFixed(2)}</div>
        </div>

        {/* AI Reply */}
        {aiReply && (
          <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-500 rounded">
            <div className="text-sm text-emerald-400">{aiReply}</div>
          </div>
        )}

        {/* Input */}
        <div className="mt-auto">
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Tell the AI what to do..."
            className="w-full px-4 py-2 bg-gray-800 text-white rounded mb-2"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded font-medium"
          >
            {isLoading ? 'Processing...' : 'Send Command'}
          </button>
        </div>

        {/* Example Commands */}
        <div className="mt-4 text-xs text-gray-500">
          <div className="font-semibold mb-1">Try:</div>
          <div>"Open the ion channel"</div>
          <div>"Take me to space"</div>
          <div>"Show toxic environment"</div>
          <div>"Set channel to 30% open"</div>
        </div>
      </div>
    </div>
  );
}

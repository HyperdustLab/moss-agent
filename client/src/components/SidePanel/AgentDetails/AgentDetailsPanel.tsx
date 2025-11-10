import { useState, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { Spinner } from '@librechat/client';
import store from '~/store';

export default function AgentDetailsPanel() {
  const activeAgent = useRecoilValue(store.activeAgentId);
  const [activeTab, setActiveTab] = useState('live');

  if (!activeAgent) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          选择一个 Agent 查看详情
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab 导航 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'live'
              ? 'border-b-2 border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          Live
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          History
        </button>
      </div>

      {activeTab === 'live' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Agent State
            </h3>
            <div className="rounded bg-gray-100 p-2 text-sm dark:bg-gray-800">
              <pre className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                {JSON.stringify({ agentId: activeAgent }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">操作历史</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">暂无历史记录</p>
          </div>
        </div>
      )}
    </div>
  );
}


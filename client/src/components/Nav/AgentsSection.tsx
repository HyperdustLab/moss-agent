interface Agent {
  id: string;
  name: string;
  type: 'doc' | 'sheet' | 'slide' | 'worker';
}

interface AgentsSectionProps {
  agents: Agent[];
  activeAgent: string | null;
  onAgentSelect: (agentId: string) => void;
  spaceId: string | null;
}

function getAgentIcon(type: string): string {
  const icons: Record<string, string> = {
    doc: '📄',
    sheet: '📊',
    slide: '📽️',
    worker: '⚙️',
  };
  return icons[type] || '🤖';
}

export default function AgentsSection({
  agents,
  activeAgent,
  onAgentSelect,
  spaceId,
}: AgentsSectionProps) {
  // 如果没有选中 space，但 agents 列表不为空，也显示 agents（用于测试）
  const shouldShowAgents = spaceId || agents.length > 0;
  const filteredAgents = spaceId ? agents : agents;

  return (
    <div className="mb-4" data-testid="agents-section">
      <div className="px-2 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
        AGENTS
      </div>
      {!shouldShowAgents ? (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-500">
          Select a space to view agents
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-500">
          No agents in this space
        </div>
      ) : (
        <div className="space-y-1">
          {filteredAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Agent clicked:', agent.id, agent.name);
                onAgentSelect(agent.id);
              }}
              className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                activeAgent === agent.id
                  ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">{getAgentIcon(agent.type)}</span>
                <span className="font-medium">{agent.name}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">{agent.type}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


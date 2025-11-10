import { atom } from 'recoil';

// Active Agent ID for AgentPanel
export const activeAgentId = atom<string | null>({
  key: 'activeAgentId',
  default: null,
});

// Active Space ID
export const activeSpaceId = atom<string | null>({
  key: 'activeSpaceId',
  default: null,
});

// Spaces list (temporary, will be fetched from API later)
export const spacesList = atom<any[]>({
  key: 'spacesList',
  default: [
    {
      id: 'space-001',
      name: '测试空间',
      memberCount: 3,
      agentCount: 4,
    },
  ],
});

// Agents list (temporary, will be fetched from API later)
export const agentsList = atom<any[]>({
  key: 'agentsList',
  default: [
    {
      id: 'agent-doc-001',
      name: '项目文档',
      type: 'doc' as const,
    },
    {
      id: 'agent-sheet-001',
      name: '数据表格',
      type: 'sheet' as const,
    },
    {
      id: 'agent-slide-001',
      name: '演示文稿',
      type: 'slide' as const,
    },
    {
      id: 'agent-worker-001',
      name: '工作流 Agent',
      type: 'worker' as const,
    },
  ],
});


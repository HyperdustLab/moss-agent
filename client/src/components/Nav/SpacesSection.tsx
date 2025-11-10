interface Space {
  id: string;
  name: string;
  memberCount: number;
  agentCount: number;
}

interface SpacesSectionProps {
  spaces: Space[];
  activeSpace: string | null;
  onSpaceSelect: (spaceId: string) => void;
}

export default function SpacesSection({
  spaces,
  activeSpace,
  onSpaceSelect,
}: SpacesSectionProps) {
  return (
    <div className="mb-4" data-testid="spaces-section">
      <div className="px-2 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
        SPACES
      </div>
      {spaces.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-500">
          No spaces yet
        </div>
      ) : (
        <div className="space-y-1">
          {spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => onSpaceSelect(space.id)}
              className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                activeSpace === space.id
                  ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <div className="font-medium">{space.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {space.memberCount} members · {space.agentCount} agents
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


interface Props {
  difficulty: string;
}

const COLORS: Record<string, string> = {
  Beginner:     'badge-green',
  Intermediate: 'badge-amber',
  Advanced:     'badge-red',
};

export default function DifficultyBadge({ difficulty }: Props) {
  return (
    <span className={`badge ${COLORS[difficulty] || 'badge-indigo'}`}>
      {difficulty}
    </span>
  );
}

import React from "react";

const TOPICS = [
  { id: "Java", label: "☕ Java" },
  { id: "Spring", label: "🌱 Spring" },
  { id: "AWS", label: "☁️ AWS" },
  { id: "SQL", label: "🗄️ SQL" },
  { id: "NoSQL", label: "🍃 NoSQL" },
  { id: "DSA", label: "🧠 DSA" },
];

interface TopicTagsProps {
  activeTopic: string | null;
  onSelect: (topic: string | null) => void;
  disabled?: boolean;
  trailingContent?: React.ReactNode;
}

const TopicTags = ({ activeTopic, onSelect, disabled, trailingContent }: TopicTagsProps) => {
  const handleClick = (topicId: string) => {
    if (disabled) return;
    onSelect(activeTopic === topicId ? null : topicId);
  };

  return (
    <div className="flex items-center gap-1.5 px-1 pb-1 flex-wrap">
      {TOPICS.map((topic) => {
        const isActive = activeTopic === topic.id;
        return (
          <button
            key={topic.id}
            onClick={() => handleClick(topic.id)}
            disabled={disabled}
            title={
              isActive
                ? `Deselect ${topic.id}`
                : `Practice ${topic.id} interview questions`
            }
            className={[
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 select-none border focus:outline-none",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.03]"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground hover:border-primary/40",
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {topic.label}
          </button>
        );
      })}
      {trailingContent}
    </div>
  );
};

export default TopicTags;

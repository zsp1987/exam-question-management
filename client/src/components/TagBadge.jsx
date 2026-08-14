import React from 'react';
import { Tag as TagIcon, X } from 'lucide-react';

export default function TagBadge({ tag, onRemove, size = 'sm' }) {
  if (!tag) return null;

  const sizeClasses = size === 'xs' 
    ? 'px-1.5 py-0.5 text-[10px]' 
    : size === 'md'
    ? 'px-3 py-1 text-sm'
    : 'px-2 py-0.5 text-xs';

  const color = tag.color || '#3b82f6';

  return (
    <span
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        color: color,
      }}
      className={`inline-flex items-center gap-1 font-medium rounded-full border transition select-none ${sizeClasses}`}
    >
      <TagIcon className="w-2.5 h-2.5 opacity-70" />
      <span>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="hover:opacity-100 opacity-60 ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

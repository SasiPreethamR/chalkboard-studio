interface IconProps {
  size?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
})

export const SelectIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 3l6.5 16 2.2-6.3 6.3-2.2L5 3z" />
  </svg>
)

export const PenIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4z" />
    <path d="M14.5 6.5l3 3" />
  </svg>
)

export const HighlighterIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M9 14l-2 5 5-2 8-8-3-3-8 8z" />
    <path d="M14 6l4 4" />
    <path d="M5 21h6" />
  </svg>
)

export const EraserIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M16 4l4 4-9 9H7l-3-3 9-10z" />
    <path d="M7 17h13" />
  </svg>
)

export const TextIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 6h14" />
    <path d="M12 6v13" />
    <path d="M9 19h6" />
  </svg>
)

export const ImageIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M21 16l-5-5L5 20" />
  </svg>
)

export const FitIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 9V5a1 1 0 0 1 1-1h4" />
    <path d="M20 9V5a1 1 0 0 0-1-1h-4" />
    <path d="M4 15v4a1 1 0 0 0 1 1h4" />
    <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
  </svg>
)

export const ResetIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4h4" />
  </svg>
)

export const TrashIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

export const ShapesIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="11" width="9" height="9" rx="1.2" />
    <circle cx="16.5" cy="8" r="4.2" />
  </svg>
)

// ---- shape-kind icons (for the options bar) --------------------------
export const RectIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3.5" y="6" width="17" height="12" rx="1.2" />
  </svg>
)

export const EllipseIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />
  </svg>
)

export const LineIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20L20 4" />
  </svg>
)

export const ArrowIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20L20 4" />
    <path d="M20 4h-6" />
    <path d="M20 4v6" />
  </svg>
)

export const TriangleIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 4L21 20H3L12 4z" />
  </svg>
)

export const DiamondIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3l9 9-9 9-9-9 9-9z" />
  </svg>
)

export const RoundRectIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3.5" y="6" width="17" height="12" rx="4" />
  </svg>
)

export const PentagonIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3l9 6.5-3.4 10.5H6.4L3 9.5 12 3z" />
  </svg>
)

export const HexagonIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M7 4h10l5 8-5 8H7l-5-8 5-8z" />
  </svg>
)

export const StarIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.8 6.6 19.5l1.2-6L3.4 9.3l6-.7L12 3z" />
  </svg>
)

export const ParallelogramIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M8 6h13l-5 12H3L8 6z" />
  </svg>
)

export const TrapezoidIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M7 6h10l4 12H3L7 6z" />
  </svg>
)

export const CrossIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
  </svg>
)

export const HeartIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 20s-7-4.6-7-9.4A3.6 3.6 0 0112 8a3.6 3.6 0 017 2.6C19 15.4 12 20 12 20z" />
  </svg>
)

export const DoubleArrowIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20L20 4" />
    <path d="M20 4h-6" />
    <path d="M20 4v6" />
    <path d="M4 20h6" />
    <path d="M4 20v-6" />
  </svg>
)

// ---- layer / visibility icons ----------------------------------------
export const LayersIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </svg>
)

export const EyeIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const EyeOffIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3.3 3.8" />
    <path d="M6.2 7.3A16 16 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 3.4-.6" />
    <path d="M9.5 10.5a3 3 0 0 0 4 4" />
  </svg>
)

export const LockIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="5" y="11" width="14" height="9" rx="1.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const UnlockIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="5" y="11" width="14" height="9" rx="1.5" />
    <path d="M8 11V8a4 4 0 0 1 7.5-2" />
  </svg>
)

export const PlusIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const ChevronUpIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 15l6-6 6 6" />
  </svg>
)

export const ChevronDownIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

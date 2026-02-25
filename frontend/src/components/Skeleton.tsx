interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-sm)',
  style,
}: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function TransactionCardSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.875rem 1.25rem',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
    }}>
      <Skeleton width="4px" height="40px" borderRadius="var(--radius-full)" />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="1rem" />
        <Skeleton width="40%" height="0.875rem" style={{ marginTop: '0.5rem' }} />
      </div>
      <Skeleton width="80px" height="1.25rem" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: 'var(--space-lg)',
    }}>
      <Skeleton width="50%" height="0.875rem" />
      <Skeleton width="70%" height="1.75rem" style={{ marginTop: '0.5rem' }} />
    </div>
  );
}

export function ChartSkeleton({ height = '300px' }: { height?: string }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: 'var(--space-lg)',
    }}>
      <Skeleton width="40%" height="1.125rem" style={{ marginBottom: '1rem' }} />
      <Skeleton width="100%" height={height} borderRadius="var(--radius-md)" />
    </div>
  );
}

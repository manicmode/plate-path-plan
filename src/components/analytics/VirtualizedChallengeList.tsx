import React, { memo } from 'react';
import { FixedSizeList as List, VariableSizeGrid as Grid } from 'react-window';

interface VirtualizedChallengeListProps {
  challenges: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight?: number;
  gridColumns?: number;
  layout?: 'list' | 'grid';
  height?: number;
  threshold?: number; // Items count threshold to start virtualizing
}

export const VirtualizedChallengeList: React.FC<VirtualizedChallengeListProps> = memo(({
  challenges,
  renderItem,
  itemHeight = 400,
  gridColumns = 3,
  layout = 'list',
  height = 600,
  threshold = 6
}) => {
  // If few items, don't virtualize for better UX
  if (challenges.length <= threshold) {
    if (layout === 'grid') {
      return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridColumns} gap-4`}>
          {challenges.map((challenge, index) => (
            <div key={challenge.id || index}>
              {renderItem(challenge, index)}
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {challenges.map((challenge, index) => (
          <div key={challenge.id || index}>
            {renderItem(challenge, index)}
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'grid') {
    // Calculate grid dimensions
    const containerWidth = 1200;
    const cardWidth = 340;
    const cardHeight = itemHeight;
    const itemsPerRow = Math.min(gridColumns, Math.floor(containerWidth / cardWidth));
    const rowCount = Math.ceil(challenges.length / itemsPerRow);

    // Item renderer for virtualized grid
    const GridItemRenderer = ({ columnIndex, rowIndex, style }: any) => {
      const index = rowIndex * itemsPerRow + columnIndex;
      if (index >= challenges.length) return null;

      const challenge = challenges[index];
      return (
        <div style={style} className="p-2">
          {renderItem(challenge, index)}
        </div>
      );
    };

    return (
      <div className="w-full" style={{ height: `${height}px` }}>
        <Grid
          columnCount={itemsPerRow}
          columnWidth={() => cardWidth}
          height={height}
          rowCount={rowCount}
          rowHeight={() => cardHeight}
          width={containerWidth}
        >
          {GridItemRenderer}
        </Grid>
      </div>
    );
  }

  // List layout
  const ListItemRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="px-4 pb-4">
      {renderItem(challenges[index], index)}
    </div>
  );

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <List
        height={height}
        itemCount={challenges.length}
        itemSize={itemHeight}
        width="100%"
      >
        {ListItemRenderer}
      </List>
    </div>
  );
});

VirtualizedChallengeList.displayName = 'VirtualizedChallengeList';
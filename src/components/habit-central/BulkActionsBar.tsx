import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Copy, X } from 'lucide-react';
import { HabitTemplate } from '@/hooks/useHabitTemplatesV2';
import { useToast } from '@/hooks/use-toast';

interface BulkActionsBarProps {
  selectedItems: Set<string>;
  currentPageItems: HabitTemplate[];
  onSelectionChange: (selectedItems: Set<string>) => void;
  allItemsData: HabitTemplate[];
}

export function BulkActionsBar({ 
  selectedItems, 
  currentPageItems, 
  onSelectionChange,
  allItemsData
}: BulkActionsBarProps) {
  const { toast } = useToast();

  const currentPageItemIds = currentPageItems.map(item => item.id);
  const selectedCurrentPageItems = currentPageItemIds.filter(id => selectedItems.has(id));
  const isAllCurrentPageSelected = currentPageItemIds.length > 0 && selectedCurrentPageItems.length === currentPageItemIds.length;
  const isIndeterminate = selectedCurrentPageItems.length > 0 && selectedCurrentPageItems.length < currentPageItemIds.length;

  const handleSelectAllCurrentPage = (checked: boolean) => {
    const newSelected = new Set(selectedItems);
    
    if (checked) {
      // Add all current page items
      currentPageItemIds.forEach(id => newSelected.add(id));
    } else {
      // Remove all current page items
      currentPageItemIds.forEach(id => newSelected.delete(id));
    }
    
    onSelectionChange(newSelected);
  };

  const handleClearSelection = () => {
    onSelectionChange(new Set());
  };

  const handleCopySlugs = () => {
    const selectedTemplates = allItemsData.filter(template => selectedItems.has(template.id));
    const slugs = selectedTemplates.map(template => template.slug).join('\n');
    
    navigator.clipboard.writeText(slugs);
    toast({ 
      title: "Copied slugs to clipboard",
      description: `${selectedTemplates.length} slugs copied`
    });
  };

  const handleExportCSV = () => {
    const selectedTemplates = allItemsData.filter(template => selectedItems.has(template.id));
    
    // CSV columns as specified
    const headers = ['slug', 'name', 'domain', 'category', 'difficulty', 'goal_type', 'default_target', 'estimated_minutes', 'tags'];
    
    const csvRows = [
      headers.join(','),
      ...selectedTemplates.map(template => {
        const row = [
          template.slug,
          `"${template.name.replace(/"/g, '""')}"`, // Escape quotes in name
          template.domain,
          template.category || '',
          template.difficulty || '',
          template.goal_type,
          template.default_target || '',
          template.estimated_minutes || '',
          template.tags ? `"${template.tags.replace(/"/g, '""')}"` : '' // Escape quotes in tags
        ];
        return row.join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `habit_templates_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ 
      title: "CSV exported successfully",
      description: `${selectedTemplates.length} templates exported`
    });
  };

  if (selectedItems.size === 0) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
        <Checkbox
          checked={isAllCurrentPageSelected}
          ref={(el) => {
            if (el && 'indeterminate' in el) (el as any).indeterminate = isIndeterminate;
          }}
          onCheckedChange={handleSelectAllCurrentPage}
        />
        <span className="text-sm text-muted-foreground">
          Select all on this page ({currentPageItems.length} items)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isAllCurrentPageSelected}
          ref={(el) => {
            if (el && 'indeterminate' in el) (el as any).indeterminate = isIndeterminate;
          }}
          onCheckedChange={handleSelectAllCurrentPage}
        />
        <span className="text-sm font-medium">
          {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopySlugs}>
          <Copy className="mr-1 h-3 w-3" />
          Copy slugs
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-1 h-3 w-3" />
          Export CSV
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleClearSelection}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      </div>
    </div>
  );
}
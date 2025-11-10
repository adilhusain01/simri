import { useState } from 'react';
import { CalendarIcon, Download } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import "react-datepicker/dist/react-datepicker.css";

export interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onExport,
  className,
}: DateRangePickerProps) {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Start Date Picker */}
      <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-[140px]',
              !startDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? startDate.toLocaleDateString() : 'Start date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <DatePicker
              selected={startDate}
              onChange={(date: Date | null) => {
                onStartDateChange(date || undefined);
                setIsStartOpen(false);
              }}
              maxDate={endDate || new Date()}
              inline
              className="border-0"
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* End Date Picker */}
      <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal min-w-[140px]',
              !endDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? endDate.toLocaleDateString() : 'End date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <DatePicker
              selected={endDate}
              onChange={(date: Date | null) => {
                onEndDateChange(date || undefined);
                setIsEndOpen(false);
              }}
              minDate={startDate}
              maxDate={new Date()}
              inline
              className="border-0"
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Export Button */}
      {onExport && startDate && endDate && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="end">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => onExport('csv')}
              >
                Export as CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => onExport('excel')}
              >
                Export as Excel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => onExport('pdf')}
              >
                Export as PDF
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
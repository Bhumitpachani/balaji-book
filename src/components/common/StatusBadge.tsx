import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  type = 'order', 
  className 
}) => {
  const getStatusClass = () => {
    if (type === 'payment') {
      return status === 'Paid' ? 'status-paid' : 'status-unpaid';
    }
    
    switch (status) {
      case 'Pending':
        return 'status-pending';
      case 'Running':
        return 'status-running';
      case 'Done':
        return 'status-done';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Badge 
      className={cn(
        getStatusClass(),
        'text-xs font-medium px-2 py-1',
        className
      )}
    >
      {status}
    </Badge>
  );
};
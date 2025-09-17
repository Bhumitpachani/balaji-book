import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService, Order } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MobileNavigation } from '@/components/common/MobileNavigation';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Download, FileText, ArrowLeft, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';


const ITEMS_PER_PAGE = 10;

export const AdminOrdersTable: React.FC = () => {
  const { logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const fetchedOrders = await apiService.getAllOrders();
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientMobileNumber?.includes(searchTerm) ||
        order.work.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Sort by creation date - newest first
    filtered.sort((a, b) => new Date(b.createdAt || b.addDate).getTime() - new Date(a.createdAt || a.addDate).getTime());

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const downloadFile = async (url: string, filename: string): Promise<Blob | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download file');
      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Preparing export...');

      // Prepare Excel data
      const excelData = filteredOrders.map(order => ({
        'Client Name': order.clientName || 'N/A',
        'Mobile Number': order.clientMobileNumber || 'N/A',
        'Address': `${order.clientAddress || 'N/A'}, ${order.clientCity || 'N/A'}`,
        'Description': order.work,
        'Added Date': formatDate(order.addDate),
        'Delivery Date': formatDate(order.deliveryDate),
        'Total Amount': order.totalAmount,
        'Received Amount': order.receivedPayment,
        'Status': order.status,
        'Payment Status': order.paymentStatus,
        'Type': order.type,
        'File Path': order.url ? `uploaded_files/${order.orderName.replace(/[^a-zA-Z0-9]/g, '_')}_${order._id.slice(-6)}.${order.url.split('.').pop() || 'bin'}` : 'No file'
      }));

      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');

      // Create ZIP file with Excel and uploaded files
      const zip = new JSZip();
      
      // Add Excel file to ZIP
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file('orders_data.xlsx', excelBuffer);

      // Create uploaded files folder in ZIP
      const filesFolder = zip.folder('uploaded_files');
      
      // Download and add uploaded files
      let fileCount = 0;
      for (const order of filteredOrders) {
        if (order.url) {
          toast.info(`Downloading files... (${++fileCount}/${filteredOrders.filter(o => o.url).length})`);
          const fileBlob = await downloadFile(order.url, `${order.orderName}_file`);
          if (fileBlob && filesFolder) {
            // Extract file extension from URL or use generic extension
            const urlParts = order.url.split('.');
            const extension = urlParts.length > 1 ? urlParts.pop() : 'bin';
            const filename = `${order.orderName.replace(/[^a-zA-Z0-9]/g, '_')}_${order._id.slice(-6)}.${extension}`;
            filesFolder.file(filename, fileBlob);
          }
        }
      }

      // Generate and download ZIP file
      toast.info('Generating ZIP file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_export_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export completed successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Orders Table</h1>
              <p className="text-muted-foreground">
                Showing {filteredOrders.length} of {orders.length} orders
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={exportToExcel} 
              disabled={isExporting || filteredOrders.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </Button>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by order name, client name, mobile, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Running">Running</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table - Desktop View */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Mobile Number</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Added Date</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Received Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium">
                        <Link to={`/orders/${order._id}`} className="hover:text-primary">
                          {order.clientName || 'N/A'}
                        </Link>
                      </TableCell>
                      <TableCell>{order.clientMobileNumber || 'N/A'}</TableCell>
                      <TableCell>{`${order.clientAddress || 'N/A'}, ${order.clientCity || 'N/A'}`}</TableCell>
                      <TableCell className="max-w-xs truncate" title={order.work}>
                        {order.work}
                      </TableCell>
                      <TableCell>{formatDate(order.addDate)}</TableCell>
                      <TableCell>{formatDate(order.deliveryDate)}</TableCell>
                      <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                      <TableCell>{formatCurrency(order.receivedPayment)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={order.status} type="order" />
                          <StatusBadge status={order.paymentStatus} type="payment" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.url ? (
                          <a 
                            href={order.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:text-primary/80"
                          >
                            <FileText className="h-4 w-4" />
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">No file</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {currentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4">
          {currentOrders.map((order) => (
            <Card key={order._id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <Link to={`/orders/${order._id}`} className="font-medium text-primary hover:text-primary/80">
                      {order.clientName || 'N/A'}
                    </Link>
                    <div className="flex flex-col gap-1 items-end">
                      <StatusBadge status={order.status} type="order" />
                      <StatusBadge status={order.paymentStatus} type="payment" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Mobile:</span>
                      <p className="font-medium">{order.clientMobileNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="font-medium">{order.type}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Address:</span>
                    <p className="font-medium">{`${order.clientAddress || 'N/A'}, ${order.clientCity || 'N/A'}`}</p>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="font-medium">{order.work}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Added:</span>
                      <p className="font-medium">{formatDate(order.addDate)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Delivery:</span>
                      <p className="font-medium">{formatDate(order.deliveryDate)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Received:</span>
                      <p className="font-medium">{formatCurrency(order.receivedPayment)}</p>
                    </div>
                  </div>

                  {order.url && (
                    <div className="flex justify-end">
                      <a 
                        href={order.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        View File
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {currentOrders.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No orders found
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <PWAInstallPrompt />
        <MobileNavigation />
      </div>
    </div>
  );
};

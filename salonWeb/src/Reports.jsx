import { useState, useEffect } from 'react';
import { 
  FileText, AlertCircle, CheckCircle, XCircle, 
  Clock, Eye, X, Filter, Search, Calendar,
  Edit, Save, Trash2, AlertTriangle
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/auth-context';

function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Status options for filtering and updating
  const statusOptions = ['reported', 'written-off', 'resolved'];

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Fetch reports
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/report');
      console.log('Fetched reports:', response.data);
      if (Array.isArray(response.data)) {
        setReports(response.data);
        setFilteredReports(response.data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      showToast('Failed to fetch reports', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update report status
  const handleUpdateStatus = async (reportId, newStatus) => {
    if (!selectedReport) return;
    
    setIsUpdating(true);
    try {
      const report = selectedReport;
      const updateData = {
        date: report.date,
        incident_type: report.incident_type,
        category: report.category,
        amount: report.amount,
        description: report.description,
        staff_id: report.staff_id,
        inventory_id: report.inventory_id || null,
        transaction_id: report.transaction_id || null,
        status: newStatus
      };
      
      await api.post(`/report/update/${reportId}`, updateData);
      
      showToast(`Report status updated to ${newStatus.replace('-', ' ')} successfully!`, 'success');
      setShowModal(false);
      setSelectedReport(null);
      await fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      showToast(error.response?.data?.message || 'Failed to update report', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle report click
  const handleReportClick = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  // Filter reports
  useEffect(() => {
    let filtered = reports;
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.description?.toLowerCase().includes(term) ||
        r.incident_type?.toLowerCase().includes(term) ||
        r.category?.toLowerCase().includes(term) ||
        r.user?.first_name?.toLowerCase().includes(term) ||
        r.user?.last_name?.toLowerCase().includes(term)
      );
    }
    
    setFilteredReports(filtered);
  }, [searchTerm, filterStatus, reports]);

  // Fetch data on mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Get status badge color
  const getStatusBadge = (status) => {
    switch(status) {
      case 'reported':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'written-off':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'resolved':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get incident type badge color
  const getIncidentTypeBadge = (type) => {
    switch(type) {
      case 'damage':
        return 'bg-red-100 text-red-700';
      case 'inventory_loss':
        return 'bg-orange-100 text-orange-700';
      case 'theft':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toLocaleString()}`;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch(status) {
      case 'reported':
        return <Clock size={16} className="text-yellow-500" />;
      case 'written-off':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'resolved':
        return <CheckCircle size={16} className="text-green-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  // Report Details Modal - WITH HIDDEN SCROLLBAR
  const ReportModal = () => {
    if (!selectedReport) return null;
    
    const [selectedStatus, setSelectedStatus] = useState(selectedReport.status);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh]">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-lg font-bold text-white">Report Details</h2>
            <button 
              onClick={() => {
                setShowModal(false);
                setSelectedReport(null);
              }} 
              className="text-white hover:bg-white/20 rounded-lg p-1"
            >
              <X size={20} />
            </button>
          </div>
          
          <div 
            className="p-5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: 'calc(85vh - 60px)' }}
          >
            {/* Report ID and Status */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Report #{selectedReport.id}</p>
                <p className="text-xs text-gray-400">
                  Submitted on {formatDate(selectedReport.created_at?.split('T')[0])}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedReport.status)} border`}>
                {getStatusIcon(selectedReport.status)}
                <span className="ml-1 capitalize">{selectedReport.status.replace('-', ' ')}</span>
              </div>
            </div>
            
            {/* Staff Information */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reported By</h3>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {selectedReport.user?.first_name?.charAt(0)}{selectedReport.user?.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedReport.user?.first_name} {selectedReport.user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">Staff Member</p>
                </div>
              </div>
            </div>
            
            {/* Report Details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Incident Type</p>
                <p className="text-sm font-semibold text-gray-800 capitalize">
                  {selectedReport.incident_type === 'inventory_loss' ? 'Inventory Loss' : selectedReport.incident_type}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-semibold text-gray-800 capitalize">{selectedReport.category}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-sm font-bold text-red-600">{formatCurrency(selectedReport.amount)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Date of Incident</p>
                <p className="text-sm font-semibold text-gray-800">{formatDate(selectedReport.date)}</p>
              </div>
            </div>
            
            {/* Description */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-gray-700">{selectedReport.description}</p>
            </div>
            
            {/* Related IDs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedReport.transaction_id && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500">Transaction ID</p>
                  <p className="text-sm font-semibold text-blue-700">#{selectedReport.transaction_id}</p>
                </div>
              )}
              {selectedReport.inventory_id && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500">Inventory ID</p>
                  <p className="text-sm font-semibold text-green-700">#{selectedReport.inventory_id}</p>
                </div>
              )}
            </div>
            
            {/* Status Update Section */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedStatus === status
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.replace('-', ' ').charAt(0).toUpperCase() + status.replace('-', ' ').slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedReport(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, selectedStatus)}
                  disabled={isUpdating || selectedStatus === selectedReport.status}
                  className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all ${
                    selectedStatus === selectedReport.status
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:shadow-md'
                  }`}
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white min-w-[300px]`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} className="text-red-500" />
            Incident Reports
          </h2>
          <p className="text-sm text-gray-500 mt-1">View and manage staff incident reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Reports</p>
              <p className="text-2xl font-bold text-gray-800">{reports.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Pending Reports</p>
              <p className="text-2xl font-bold text-yellow-600">
                {reports.filter(r => r.status === 'reported').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Resolved Reports</p>
              <p className="text-2xl font-bold text-green-600">
                {reports.filter(r => r.status === 'resolved').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} className="text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
          >
            <option value="all">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replace('-', ' ').charAt(0).toUpperCase() + status.replace('-', ' ').slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Table - Amount Column Removed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Incident Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reported By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 text-sm">
                    {reports.length === 0 ? 'No incident reports found' : 'No reports match your filters'}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr 
                    key={report.id} 
                    onClick={() => handleReportClick(report)}
                    className="hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700">#{report.id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getIncidentTypeBadge(report.incident_type)}`}>
                        {report.incident_type === 'inventory_loss' ? 'Inventory Loss' : report.incident_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{report.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">
                            {report.user?.first_name?.charAt(0)}{report.user?.last_name?.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700">
                          {report.user?.first_name} {report.user?.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(report.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1 capitalize">{report.status.replace('-', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportClick(report);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gray-500">
            Showing {filteredReports.length} of {reports.length} incident reports
          </p>
        </div>
      </div>

      {/* Report Details Modal */}
      {showModal && <ReportModal />}
    </div>
  );
}

export default Reports;

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeCard } from "@/components/theme";

interface CallHistory {
  id: string;
  call_id: string;
  assistant_id: string;
  phone_number: string;
  participant_identity: string;
  start_time: string;
  end_time: string;
  call_duration: number;
  call_status: string;
  transcription: Array<{ role: string; content: any }>;
  created_at: string;
}

interface RecentCallsProps {
  callLogs: any[];
  isLoading: boolean;
}

export default function RecentCalls({ callLogs, isLoading }: RecentCallsProps) {
  const { user, loading: isAuthLoading } = useAuth();
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<CallHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchCallHistory();
  }, [isAuthLoading, user]);

  useEffect(() => {
    filterCalls();
  }, [callHistory, searchTerm, statusFilter]);

  const fetchCallHistory = async () => {
    // Don't fetch data if auth is still loading or user is not authenticated
    if (isAuthLoading || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching call history:', error);
        return;
      }

      setCallHistory(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCalls = () => {
    let filtered = callHistory;

    // Filter by search term (phone number or participant identity)
    if (searchTerm) {
      filtered = filtered.filter(call =>
        call.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.participant_identity?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.call_status === statusFilter);
    }

    setFilteredCalls(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      dropped: { color: 'bg-yellow-100 text-yellow-800', label: 'Dropped' },
      spam: { color: 'bg-orange-100 text-orange-800', label: 'Spam' },
      no_response: { color: 'bg-gray-100 text-gray-800', label: 'No Response' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] ||
      { color: 'bg-blue-100 text-blue-800', label: status };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getCallOutcome = (transcription: Array<{ role: string; content: any }>) => {
    if (!transcription || transcription.length === 0) return 'No outcome';

    const lastMessage = transcription[transcription.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      // Safely convert content to string and handle different data types
      const content = typeof lastMessage.content === 'string'
        ? lastMessage.content.toLowerCase()
        : String(lastMessage.content || '').toLowerCase();

      if (content.includes('appointment') || content.includes('booked')) return 'Booked Appointment';
      if (content.includes('spam')) return 'Spam';
      if (content.includes('not qualified')) return 'Not Qualified';
      if (content.includes('message')) return 'Message to Franchise';
    }

    return 'Call Dropped';
  };

  // Pagination
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCalls = filteredCalls.slice(startIndex, endIndex);

  // Get today's date for the badge
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  if (isAuthLoading || loading) {
    return (
      <Card variant="glass" className="transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
        <CardHeader className="pb-[var(--space-md)] space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center liquid-space-md">
              <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/60 liquid-rounded-sm" />
              <CardTitle className="text-[var(--text-lg)] font-[var(--font-extralight)] tracking-tight text-liquid">
                Recent Calls
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[var(--text-xs)] font-[var(--font-normal)]">
              {today}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-[var(--space-2xl)] pt-0">
          <div className="flex items-center justify-center h-32">
            <div className="text-[var(--text-muted)]">Loading call history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
      <CardHeader className="pb-[var(--space-md)] space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center liquid-space-md">
            <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/60 liquid-rounded-sm" />
            <CardTitle className="text-[var(--text-lg)] font-[var(--font-extralight)] tracking-tight text-liquid">
              Recent Calls
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[var(--text-xs)] font-[var(--font-normal)]">
            {today}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-[var(--space-2xl)] pt-0">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="dropped">Dropped</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="no_response">No Response</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Call History Table */}
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                {/* <TableHead>Call Outcome</TableHead> */}
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No calls found
                  </TableCell>
                </TableRow>
              ) : (
                currentCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {call.participant_identity || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {call.phone_number || 'No number'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(call.start_time)}
                    </TableCell>
                    <TableCell>
                      {formatDuration(call.call_duration)}
                    </TableCell>
                    {/* <TableCell>
                      {getCallOutcome(call.transcription)}
                    </TableCell> */}
                    <TableCell>
                      {getStatusBadge(call.call_status)}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredCalls.length)} of {filteredCalls.length} calls
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              {totalPages > 5 && (
                <>
                  <span className="text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  Tabs,
  TextInput,
  ActionIcon,
  Menu,
  Badge,
  Select,
  Stack,
  Text,
  Table,
  ScrollArea,
  Modal,
  Grid,
  Skeleton,
  Tooltip,
  Popover,
  Box,
  Checkbox,
  Alert,
  Divider,
  Chip,
  Collapse,
  Indicator,
} from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCalendarEvent,
  IconList,
  IconPlus,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconDotsVertical,
  IconCheck,
  IconX,
  IconClock,
  IconEdit,
  IconTrash,
  IconFileExport,
  IconAlertCircle,
  IconChevronDown,
  IconUserCheck,
  IconBuildingHospital,
  IconAdjustments,
  IconCalendarStats,
  IconMessage,
  IconPhone,
  IconFileText,
} from '@tabler/icons-react';
import { format, addDays, startOfWeek, endOfWeek, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useNotifications } from '@/hooks/useNotifications';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AppointmentService } from '@/services/appointment.service';
import { PatientService } from '@/services/patient.service';
import { UserService } from '@/services/user.service';
import { ClinicService } from '@/services/clinic.service';
import { ExportService } from '@/services/export.service';
import { formatDate, formatTime, formatDateTime, formatDuration } from '@/utils/formatters';
import { getStatusColor, getStatusIcon } from '@/utils/statusColors';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { AppointmentForm } from '@/components/appointments/AppointmentForm';
import { AppointmentDetails } from '@/components/appointments/AppointmentDetails';
import { AppointmentFilterDrawer } from '@/components/appointments/AppointmentFilterDrawer';
import { NoDataPlaceholder } from '@/components/NoDataPlaceholder';
import { AppointmentStatus, AppointmentType } from '@clinicwave/shared';

// Set up the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Define appointment interface
interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  roomId?: string;
  title: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string;
  reason?: string;
  followUp?: boolean;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone?: string;
    email?: string;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialty?: string;
  };
  clinic: {
    id: string;
    name: string;
  };
  room?: {
    id: string;
    name: string;
    floor?: string;
  };
}

// Define filter state interface
interface FilterState {
  search: string;
  status: AppointmentStatus | null;
  type: AppointmentType | null;
  doctorId: string | null;
  patientId: string | null;
  clinicId: string | null;
  dateRange: [Date | null, Date | null];
  followUp: boolean | null;
}

const AppointmentsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { sendNotification } = useNotifications();
  const socket = useWebSocket();
  
  // Refs
  const calendarRef = useRef(null);
  
  // State
  const [activeTab, setActiveTab] = useState<string>('calendar');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<string>(Views.WEEK);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [appointmentToView, setAppointmentToView] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: null,
    type: null,
    doctorId: user?.role === 'DOCTOR' ? user?.id : null,
    patientId: null,
    clinicId: user?.clinicId || null,
    dateRange: [startOfDay(new Date()), endOfDay(addDays(new Date(), 7))],
    followUp: null,
  });
  
  // UI state
  const [filtersOpen, { toggle: toggleFilters }] = useDisclosure(false);
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [createModalOpen, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [detailsModalOpen, { open: openDetailsModal, close: closeDetailsModal }] = useDisclosure(false);
  const [advancedSearch, { toggle: toggleAdvancedSearch }] = useDisclosure(false);
  
  // Permissions
  const canCreate = hasPermission('appointments', 'create');
  const canUpdate = hasPermission('appointments', 'update');
  const canDelete = hasPermission('appointments', 'delete');
  const canExport = hasPermission('appointments', 'export');
  
  // Fetch appointments
  const {
    data: appointmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    ['appointments', currentPage, pageSize, sortBy, sortOrder, filters, calendarView, currentDate],
    async () => {
      // Determine date range based on calendar view
      let startDate = filters.dateRange[0];
      let endDate = filters.dateRange[1];
      
      if (activeTab === 'calendar') {
        switch (calendarView) {
          case Views.DAY:
            startDate = startOfDay(currentDate);
            endDate = endOfDay(currentDate);
            break;
          case Views.WEEK:
            startDate = startOfWeek(currentDate);
            endDate = endOfWeek(currentDate);
            break;
          case Views.MONTH:
            startDate = startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
            endDate = endOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
            break;
        }
      }
      
      return AppointmentService.getAppointments({
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
        search: filters.search || searchQuery,
        status: filters.status || undefined,
        type: filters.type || undefined,
        doctorId: filters.doctorId || undefined,
        patientId: filters.patientId || undefined,
        clinicId: filters.clinicId || undefined,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        followUp: filters.followUp !== null ? filters.followUp : undefined,
      });
    },
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
    }
  );
  
  // Fetch doctors for filter
  const { data: doctors } = useQuery(
    ['doctors'],
    () => UserService.getDoctors(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
  
  // Fetch clinics for filter
  const { data: clinics } = useQuery(
    ['clinics'],
    () => ClinicService.getClinics(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
  
  // Update appointment status mutation
  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: AppointmentStatus }) => 
      AppointmentService.updateAppointmentStatus(id, status),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['appointments']);
        notifications.show({
          title: t('Status Updated'),
          message: t('Appointment status has been updated successfully.'),
          color: 'green',
        });
        
        // Send real-time notification
        socket?.emit('appointment:statusChanged', {
          appointmentId: data.id,
          status: data.status,
          patientId: data.patientId,
          doctorId: data.doctorId,
        });
      },
      onError: (error: any) => {
        notifications.show({
          title: t('Error'),
          message: error.message || t('Failed to update appointment status. Please try again.'),
          color: 'red',
        });
      },
    }
  );
  
  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation(
    (id: string) => AppointmentService.deleteAppointment(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['appointments']);
        notifications.show({
          title: t('Appointment Deleted'),
          message: t('The appointment has been successfully deleted.'),
          color: 'green',
        });
        setAppointmentToDelete(null);
        closeDeleteModal();
      },
      onError: (error: any) => {
        notifications.show({
          title: t('Error'),
          message: error.message || t('Failed to delete appointment. Please try again.'),
          color: 'red',
        });
      },
    }
  );
  
  // Export appointments mutation
  const exportAppointmentsMutation = useMutation(
    (format: 'csv' | 'excel' | 'pdf') => ExportService.exportAppointments(format, {
      search: filters.search || searchQuery,
      status: filters.status || undefined,
      type: filters.type || undefined,
      doctorId: filters.doctorId || undefined,
      patientId: filters.patientId || undefined,
      clinicId: filters.clinicId || undefined,
      startDate: filters.dateRange[0] ? format(filters.dateRange[0], 'yyyy-MM-dd') : undefined,
      endDate: filters.dateRange[1] ? format(filters.dateRange[1], 'yyyy-MM-dd') : undefined,
      selectedIds: selectedAppointments.length > 0 ? selectedAppointments : undefined,
    }),
    {
      onSuccess: () => {
        notifications.show({
          title: t('Export Successful'),
          message: t('Appointments data has been exported successfully.'),
          color: 'green',
        });
      },
      onError: (error: any) => {
        notifications.show({
          title: t('Export Failed'),
          message: error.message || t('Failed to export appointments data. Please try again.'),
          color: 'red',
        });
      },
    }
  );
  
  // Transform appointments for calendar view
  const calendarEvents = useMemo(() => {
    if (!appointmentsData?.data) return [];
    
    return appointmentsData.data.map((appointment: Appointment) => ({
      id: appointment.id,
      title: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      start: new Date(appointment.startTime),
      end: new Date(appointment.endTime),
      resource: appointment,
    }));
  }, [appointmentsData?.data]);
  
  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };
  
  // Handle filter change
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  // Handle filter reset
  const handleFilterReset = () => {
    setCurrentPage(1);
    setSearchQuery('');
    setFilters({
      search: '',
      status: null,
      type: null,
      doctorId: user?.role === 'DOCTOR' ? user?.id : null,
      patientId: null,
      clinicId: user?.clinicId || null,
      dateRange: [startOfDay(new Date()), endOfDay(addDays(new Date(), 7))],
      followUp: null,
    });
  };
  
  // Handle sort change
  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  // Handle delete appointment
  const handleDeleteAppointment = (id: string) => {
    setAppointmentToDelete(id);
    openDeleteModal();
  };
  
  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (appointmentToDelete) {
      deleteAppointmentMutation.mutate(appointmentToDelete);
    }
  };
  
  // Handle view appointment
  const handleViewAppointment = (id: string) => {
    setAppointmentToView(id);
    openDetailsModal();
  };
  
  // Handle status change
  const handleStatusChange = (id: string, status: AppointmentStatus) => {
    updateStatusMutation.mutate({ id, status });
  };
  
  // Handle export
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    exportAppointmentsMutation.mutate(format);
  };
  
  // Handle calendar navigation
  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };
  
  // Handle calendar view change
  const handleViewChange = (view: string) => {
    setCalendarView(view);
  };
  
  // Handle calendar event selection
  const handleSelectEvent = (event: any) => {
    handleViewAppointment(event.id);
  };
  
  // Handle calendar slot selection (for creating new appointments)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!canCreate) return;
    
    // Set start and end time in the form and open create modal
    openCreateModal();
    // You would typically set these values in a form state
  };
  
  // Handle row selection
  const handleRowSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAppointments(prev => [...prev, id]);
    } else {
      setSelectedAppointments(prev => prev.filter(appointmentId => appointmentId !== id));
    }
  };
  
  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && appointmentsData?.data) {
      setSelectedAppointments(appointmentsData.data.map((appointment: Appointment) => appointment.id));
    } else {
      setSelectedAppointments([]);
    }
  };
  
  // Check if all rows are selected
  const allSelected = useMemo(() => {
    if (!appointmentsData?.data || appointmentsData.data.length === 0) return false;
    return appointmentsData.data.every((appointment: Appointment) => 
      selectedAppointments.includes(appointment.id)
    );
  }, [appointmentsData, selectedAppointments]);
  
  // Check if some rows are selected
  const someSelected = useMemo(() => {
    return selectedAppointments.length > 0 && !allSelected;
  }, [selectedAppointments, allSelected]);
  
  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status) count++;
    if (filters.type) count++;
    if (filters.doctorId) count++;
    if (filters.patientId) count++;
    if (filters.clinicId && user?.role !== 'DOCTOR') count++;
    if (filters.dateRange[0] || filters.dateRange[1]) count++;
    if (filters.followUp !== null) count++;
    return count;
  }, [filters, user?.role]);
  
  // Set up WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;
    
    // Listen for appointment updates
    socket.on('appointment:created', (data) => {
      queryClient.invalidateQueries(['appointments']);
      notifications.show({
        title: t('New Appointment'),
        message: t('A new appointment has been scheduled.'),
        color: 'blue',
      });
    });
    
    socket.on('appointment:updated', (data) => {
      queryClient.invalidateQueries(['appointments']);
    });
    
    socket.on('appointment:deleted', (data) => {
      queryClient.invalidateQueries(['appointments']);
    });
    
    socket.on('appointment:statusChanged', (data) => {
      queryClient.invalidateQueries(['appointments']);
      
      // Show notification only if relevant to current user
      if (user?.role === 'DOCTOR' && data.doctorId === user.id) {
        const statusMessages: Record<AppointmentStatus, string> = {
          SCHEDULED: t('Appointment has been scheduled'),
          CONFIRMED: t('Appointment has been confirmed'),
          CHECKED_IN: t('Patient has checked in'),
          IN_PROGRESS: t('Appointment is in progress'),
          COMPLETED: t('Appointment has been completed'),
          CANCELLED: t('Appointment has been cancelled'),
          NO_SHOW: t('Patient did not show up'),
          RESCHEDULED: t('Appointment has been rescheduled'),
        };
        
        notifications.show({
          title: t('Appointment Status Changed'),
          message: statusMessages[data.status] || t('Status updated'),
          color: getStatusColor(data.status),
        });
      }
    });
    
    return () => {
      socket.off('appointment:created');
      socket.off('appointment:updated');
      socket.off('appointment:deleted');
      socket.off('appointment:statusChanged');
    };
  }, [socket, queryClient, t, user]);
  
  // Custom event styling for calendar
  const eventStyleGetter = (event: any) => {
    const status = event.resource.status;
    const backgroundColor = getStatusColor(status);
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: '#fff',
        border: '0px',
        display: 'block',
      },
    };
  };
  
  // Render table rows
  const renderTableRows = () => {
    if (!appointmentsData?.data || appointmentsData.data.length === 0) {
      return (
        <tr>
          <td colSpan={9}>
            <NoDataPlaceholder
              title={t('No appointments found')}
              description={t('Try adjusting your search or filters to find what you\'re looking for.')}
              icon={<IconCalendarEvent size={50} />}
              actionLabel={canCreate ? t('Schedule Appointment') : undefined}
              onAction={canCreate ? openCreateModal : undefined}
            />
          </td>
        </tr>
      );
    }
    
    return appointmentsData.data.map((appointment: Appointment) => (
      <tr key={appointment.id}>
        <td>
          <Checkbox
            checked={selectedAppointments.includes(appointment.id)}
            onChange={(event) => handleRowSelection(appointment.id, event.currentTarget.checked)}
          />
        </td>
        <td>
          <Group spacing="xs">
            <Text size="sm" fw={500}>
              {formatDate(appointment.startTime)}
            </Text>
            <Text size="xs" color="dimmed">
              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
            </Text>
          </Group>
        </td>
        <td>
          <Group spacing="xs">
            <Text size="sm" fw={500} component={Link} to={`/patients/${appointment.patient.id}`}>
              {appointment.patient.lastName}, {appointment.patient.firstName}
            </Text>
          </Group>
        </td>
        <td>
          <Group spacing="xs">
            <Text size="sm">
              {appointment.doctor.lastName}, {appointment.doctor.firstName}
            </Text>
            {appointment.doctor.specialty && (
              <Text size="xs" color="dimmed">
                {appointment.doctor.specialty}
              </Text>
            )}
          </Group>
        </td>
        <td>
          <Badge
            color={getStatusColor(appointment.status)}
            variant="light"
            leftSection={getStatusIcon(appointment.status)}
          >
            {t(appointment.status)}
          </Badge>
        </td>
        <td>{t(appointment.type)}</td>
        <td>{appointment.clinic.name}</td>
        <td>{appointment.room?.name || '-'}</td>
        <td>
          <Group spacing="xs" position="right">
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon>
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t('Appointment')}</Menu.Label>
                <Menu.Item 
                  icon={<IconEye size={16} />}
                  onClick={() => handleViewAppointment(appointment.id)}
                >
                  {t('View Details')}
                </Menu.Item>
                {canUpdate && (
                  <Menu.Item 
                    icon={<IconEdit size={16} />}
                    component={Link}
                    to={`/appointments/${appointment.id}/edit`}
                  >
                    {t('Edit Appointment')}
                  </Menu.Item>
                )}
                {canDelete && (
                  <Menu.Item 
                    icon={<IconTrash size={16} />}
                    color="red"
                    onClick={() => handleDeleteAppointment(appointment.id)}
                  >
                    {t('Delete Appointment')}
                  </Menu.Item>
                )}
                
                <Menu.Divider />
                
                <Menu.Label>{t('Status')}</Menu.Label>
                {canUpdate && appointment.status !== 'CONFIRMED' && (
                  <Menu.Item 
                    icon={<IconCheck size={16} />}
                    onClick={() => handleStatusChange(appointment.id, 'CONFIRMED')}
                    color="green"
                  >
                    {t('Confirm')}
                  </Menu.Item>
                )}
                {canUpdate && appointment.status !== 'CHECKED_IN' && (
                  <Menu.Item 
                    icon={<IconUserCheck size={16} />}
                    onClick={() => handleStatusChange(appointment.id, 'CHECKED_IN')}
                    color="blue"
                  >
                    {t('Check In')}
                  </Menu.Item>
                )}
                {canUpdate && appointment.status !== 'IN_PROGRESS' && (
                  <Menu.Item 
                    icon={<IconClock size={16} />}
                    onClick={() => handleStatusChange(appointment.id, 'IN_PROGRESS')}
                    color="indigo"
                  >
                    {t('Start')}
                  </Menu.Item>
                )}
                {canUpdate && appointment.status !== 'COMPLETED' && (
                  <Menu.Item 
                    icon={<IconCheck size={16} />}
                    onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
                    color="teal"
                  >
                    {t('Complete')}
                  </Menu.Item>
                )}
                {canUpdate && appointment.status !== 'CANCELLED' && (
                  <Menu.Item 
                    icon={<IconX size={16} />}
                    onClick={() => handleStatusChange(appointment.id, 'CANCELLED')}
                    color="red"
                  >
                    {t('Cancel')}
                  </Menu.Item>
                )}
                {canUpdate && appointment.status !== 'NO_SHOW' && (
                  <Menu.Item 
                    icon={<IconX size={16} />}
                    onClick={() => handleStatusChange(appointment.id, 'NO_SHOW')}
                    color="orange"
                  >
                    {t('No Show')}
                  </Menu.Item>
                )}
                
                <Menu.Divider />
                
                <Menu.Label>{t('Actions')}</Menu.Label>
                <Menu.Item 
                  icon={<IconMessage size={16} />}
                  component={Link}
                  to={`/messages/new?patientId=${appointment.patient.id}`}
                >
                  {t('Message Patient')}
                </Menu.Item>
                <Menu.Item 
                  icon={<IconPhone size={16} />}
                  component="a"
                  href={`tel:${appointment.patient.phone}`}
                  disabled={!appointment.patient.phone}
                >
                  {t('Call Patient')}
                </Menu.Item>
                <Menu.Item 
                  icon={<IconFileText size={16} />}
                  component={Link}
                  to={`/medical-records/create/${appointment.patient.id}?appointmentId=${appointment.id}`}
                >
                  {t('Create Medical Record')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </td>
      </tr>
    ));
  };
  
  // Loading skeletons
  const renderSkeletons = () => {
    if (activeTab === 'list') {
      return Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          <td><Skeleton height={20} width={20} radius="sm" /></td>
          <td><Skeleton height={20} width={120} radius="sm" /></td>
          <td><Skeleton height={20} width={150} radius="sm" /></td>
          <td><Skeleton height={20} width={150} radius="sm" /></td>
          <td><Skeleton height={20} width={100} radius="sm" /></td>
          <td><Skeleton height={20} width={80} radius="sm" /></td>
          <td><Skeleton height={20} width={100} radius="sm" /></td>
          <td><Skeleton height={20} width={80} radius="sm" /></td>
          <td>
            <Group spacing="xs" position="right">
              <Skeleton height={28} width={28} radius="sm" />
            </Group>
          </td>
        </tr>
      ));
    } else {
      return (
        <Box sx={{ height: 700 }}>
          <Skeleton height="100%" radius="md" />
        </Box>
      );
    }
  };
  
  return (
    <Container size="xl" px="xs">
      <Stack spacing="md">
        {/* Header */}
        <Group position="apart">
          <Title order={2}>{t('Appointments')}</Title>
          <Group spacing="sm">
            {canCreate && (
              <Button
                leftIcon={<IconPlus size={16} />}
                onClick={openCreateModal}
              >
                {t('Schedule Appointment')}
              </Button>
            )}
          </Group>
        </Group>
        
        {/* Tabs */}
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="calendar" icon={<IconCalendarEvent size={16} />}>
              {t('Calendar')}
            </Tabs.Tab>
            <Tabs.Tab value="list" icon={<IconList size={16} />}>
              {t('List')}
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
        
        {/* Search and filters */}
        <Paper p="md" withBorder>
          <Stack spacing="md">
            <Group position="apart">
              <Group spacing="sm" style={{ flex: 1 }}>
                <TextInput
                  placeholder={t('Search appointments...')}
                  icon={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{ flex: 1 }}
                  rightSection={
                    searchQuery ? (
                      <ActionIcon onClick={() => setSearchQuery('')}>
                        <IconX size={16} />
                      </ActionIcon>
                    ) : null
                  }
                />
                <Button variant="default" onClick={handleSearch}>
                  {t('Search')}
                </Button>
                <Button 
                  variant="subtle" 
                  leftIcon={<IconChevronDown size={16} />}
                  onClick={toggleAdvancedSearch}
                >
                  {t('Advanced')}
                </Button>
              </Group>
              <Group spacing="xs">
                <Button
                  variant={activeFilterCount > 0 ? "light" : "subtle"}
                  leftIcon={<IconFilter size={16} />}
                  onClick={toggleFilters}
                  color={activeFilterCount > 0 ? "blue" : "gray"}
                >
                  {t('Filters')}
                  {activeFilterCount > 0 && (
                    <Badge size="xs" variant="filled" ml={5} circle>
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <Button variant="default" leftIcon={<IconFileExport size={16} />}>
                      {t('Export')}
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item 
                      icon={<IconFileExport size={16} />} 
                      onClick={() => handleExport('csv')}
                      disabled={!canExport}
                    >
                      {t('Export as CSV')}
                    </Menu.Item>
                    <Menu.Item 
                      icon={<IconFileExport size={16} />} 
                      onClick={() => handleExport('excel')}
                      disabled={!canExport}
                    >
                      {t('Export as Excel')}
                    </Menu.Item>
                    <Menu.Item 
                      icon={<IconFileExport size={16} />} 
                      onClick={() => handleExport('pdf')}
                      disabled={!canExport}
                    >
                      {t('Export as PDF')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
            
            {/* Advanced search */}
            <Collapse in={advancedSearch}>
              <Grid gutter="md">
                <Grid.Col span={6} md={3}>
                  <Select
                    label={t('Status')}
                    placeholder={t('Select status')}
                    clearable
                    data={Object.values(AppointmentStatus).map(status => ({
                      value: status,
                      label: t(status),
                    }))}
                    value={filters.status}
                    onChange={(value) => handleFilterChange({ status: value as AppointmentStatus | null })}
                  />
                </Grid.Col>
                <Grid.Col span={6} md={3}>
                  <Select
                    label={t('Type')}
                    placeholder={t('Select type')}
                    clearable
                    data={Object.values(AppointmentType).map(type => ({
                      value: type,
                      label: t(type),
                    }))}
                    value={filters.type}
                    onChange={(value) => handleFilterChange({ type: value as AppointmentType | null })}
                  />
                </Grid.Col>
                <Grid.Col span={6} md={3}>
                  <Select
                    label={t('Doctor')}
                    placeholder={t('Select doctor')}
                    clearable
                    disabled={user?.role === 'DOCTOR'}
                    data={doctors?.data?.map((doctor: any) => ({
                      value: doctor.id,
                      label: `${doctor.lastName}, ${doctor.firstName}`,
                    })) || []}
                    value={filters.doctorId}
                    onChange={(value) => handleFilterChange({ doctorId: value })}
                  />
                </Grid.Col>
                <Grid.Col span={6} md={3}>
                  <Select
                    label={t('Clinic')}
                    placeholder={t('Select clinic')}
                    clearable
                    data={clinics?.data?.map((clinic: any) => ({
                      value: clinic.id,
                      label: clinic.name,
                    })) || []}
                    value={filters.clinicId}
                    onChange={(value) => handleFilterChange({ clinicId: value })}
                  />
                </Grid.Col>
                <Grid.Col span={12} md={6}>
                  <DatePickerInput
                    type="range"
                    label={t('Date Range')}
                    placeholder={t('Select date range')}
                    clearable
                    value={filters.dateRange}
                    onChange={(value) => handleFilterChange({ dateRange: value as [Date | null, Date | null] })}
                  />
                </Grid.Col>
                <Grid.Col span={6} md={3}>
                  <Select
                    label={t('Follow-up')}
                    placeholder={t('Select option')}
                    clearable
                    data={[
                      { value: 'true', label: t('Yes') },
                      { value: 'false', label: t('No') },
                    ]}
                    value={filters.followUp === null ? null : String(filters.followUp)}
                    onChange={(value) => handleFilterChange({ followUp: value === null ? null : value === 'true' })}
                  />
                </Grid.Col>
              </Grid>
              <Group position="right" mt="md">
                <Button variant="subtle" onClick={handleFilterReset}>
                  {t('Reset Filters')}
                </Button>
                <Button onClick={handleSearch}>
                  {t('Apply Filters')}
                </Button>
              </Group>
            </Collapse>
            
            {/* Active filters */}
            {activeFilterCount > 0 && (
              <Group spacing="xs">
                <Text size="sm" color="dimmed">{t('Active filters')}:</Text>
                {filters.search && (
                  <Chip
                    checked={false}
                    variant="filled"
                    size="xs"
                    onDelete={() => handleFilterChange({ search: '' })}
                  >
                    {t('Search')}: {filters.search}
                  </Chip>
                )}
                {filters.status && (
                  <Chip
                    checked={false}
                    variant="filled"
                    size="xs"
                    onDelete={() => handleFilterChange({ status: null })}
                  >
                    {t('Status')}: {t(filters.status)}
                  </Chip>
                )}
                {filters.type && (
                  <Chip
                    checked={false}
                    variant="filled"
                    size="xs"
                    onDelete={() => handleFilterChange({ type: null })}
                  >
                    {t('Type')}: {t(filters.type)}
                  </Chip>
                )}
                {filters.doctorId && (
                  <Chip
                    checked={false}
                    variant="filled"
                    size="xs"
                    onDelete={() => user?.role !== 'DOCTOR' ? handleFilterChange({ doctorId: null }) : null}
                  >
                    {t('Doctor')}: {doctors?.data?.find((d: any) => d.id === filters.doctorId)?.lastName || filters.doctorId}
                  </Chip>
                )}
                {/* Add more filter chips as needed */}
                {activeFilterCount > 3 && (
                  <Badge size="sm">+{activeFilterCount - 3}</Badge>
                )}
                <Button variant="subtle" compact onClick={handleFilterReset}>
                  {t('Clear All')}
                </Button>
              </Group>
            )}
          </Stack>
        </Paper>
        
        {/* Selected appointments actions */}
        {selectedAppointments.length > 0 && (
          <Paper p="md" withBorder>
            <Group position="apart">
              <Text>
                {t('{{count}} appointments selected', { count: selectedAppointments.length })}
              </Text>
              <Group spacing="xs">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExport('excel')}
                  disabled={!canExport}
                >
                  {t('Export Selected')}
                </Button>
                <Button 
                  variant="outline" 
                  color="red" 
                  size="sm"
                  onClick={() => {/* Implement bulk delete */}}
                  disabled={!canDelete}
                >
                  {t('Delete Selected')}
                </Button>
                <Button 
                  variant="subtle" 
                  size="sm"
                  onClick={() => setSelectedAppointments([])}
                >
                  {t('Clear Selection')}
                </Button>
              </Group>
            </Group>
          </Paper>
        )}
        
        {/* Error message */}
        {isError && (
          <Alert icon={<IconAlertCircle size={16} />} title={t('Error')} color="red">
            <Stack spacing="xs">
              <Text size="sm">
                {error instanceof Error ? error.message : t('An error occurred while fetching appointments.')}
              </Text>
              <Button 
                variant="outline" 
                color="red" 
                size="xs" 
                leftIcon={<IconRefresh size={16} />}
                onClick={() => refetch()}
              >
                {t('Try Again')}
              </Button>
            </Stack>
          </Alert>
        )}
        
        {/* Appointments content */}
        <Paper p="md" withBorder>
          {activeTab === 'calendar' ? (
            /* Calendar View */
            isLoading ? (
              <Box sx={{ height: 700 }}>
                <Skeleton height="100%" radius="md" />
              </Box>
            ) : (
              <Box sx={{ height: 700 }}>
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  views={['month', 'week', 'day', 'agenda']}
                  defaultView={Views.WEEK}
                  view={calendarView as any}
                  onView={handleViewChange}
                  date={currentDate}
                  onNavigate={handleNavigate}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable={canCreate}
                  eventPropGetter={eventStyleGetter}
                  popup
                  ref={calendarRef}
                  messages={{
                    today: t('Today'),
                    previous: t('Back'),
                    next: t('Next'),
                    month: t('Month'),
                    week: t('Week'),
                    day: t('Day'),
                    agenda: t('Agenda'),
                    date: t('Date'),
                    time: t('Time'),
                    event: t('Event'),
                    allDay: t('All Day'),
                    showMore: (total) => t('+ {{count}} more', { count: total }),
                  }}
                />
              </Box>
            )
          ) : (
            /* List View */
            isLoading ? (
              <ScrollArea>
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <Checkbox
                          onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                          checked={allSelected}
                          indeterminate={someSelected}
                        />
                      </th>
                      <th 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSortChange('startTime')}
                      >
                        <Group spacing={5}>
                          {t('Date & Time')}
                          {sortBy === 'startTime' && (
                            sortOrder === 'asc' ? '↑' : '↓'
                          )}
                        </Group>
                      </th>
                      <th>{t('Patient')}</th>
                      <th>{t('Doctor')}</th>
                      <th>{t('Status')}</th>
                      <th>{t('Type')}</th>
                      <th>{t('Clinic')}</th>
                      <th>{t('Room')}</th>
                      <th style={{ width: 80 }}>{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>{renderSkeletons()}</tbody>
                </Table>
              </ScrollArea>
            ) : (
              <ScrollArea>
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <Checkbox
                          onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                          checked={allSelected}
                          indeterminate={someSelected}
                        />
                      </th>
                      <th 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSortChange('startTime')}
                      >
                        <Group spacing={5}>
                          {t('Date & Time')}
                          {sortBy === 'startTime' && (
                            sortOrder === 'asc' ? '↑' : '↓'
                          )}
                        </Group>
                      </th>
                      <th>{t('Patient')}</th>
                      <th>{t('Doctor')}</th>
                      <th>{t('Status')}</th>
                      <th>{t('Type')}</th>
                      <th>{t('Clinic')}</th>
                      <th>{t('Room')}</th>
                      <th style={{ width: 80 }}>{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>{renderTableRows()}</tbody>
                </Table>
              </ScrollArea>
            )
          )}
          
          {/* Pagination (only for list view) */}
          {activeTab === 'list' && appointmentsData?.meta && appointmentsData.meta.totalPages > 1 && (
            <Group position="apart" mt="md">
              <Text size="sm" color="dimmed">
                {t('Showing {{from}} to {{to}} of {{total}} appointments', {
                  from: (currentPage - 1) * pageSize + 1,
                  to: Math.min(currentPage * pageSize, appointmentsData.meta.total),
                  total: appointmentsData.meta.total,
                })}
              </Text>
              <Group spacing="xs">
                <Select
                  size="xs"
                  style={{ width: 80 }}
                  data={['10', '25', '50', '100'].map(value => ({ value, label: value }))}
                  value={String(pageSize)}
                  onChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                />
                <Pagination
                  total={appointmentsData.meta.totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  withEdges
                />
              </Group>
            </Group>
          )}
        </Paper>
      </Stack>
      
      {/* Create Appointment Modal */}
      <Modal
        opened={createModalOpen}
        onClose={closeCreateModal}
        title={t('Schedule Appointment')}
        size="lg"
      >
        <AppointmentForm
          onSubmit={(data) => {
            // Handle form submission
            closeCreateModal();
            refetch();
          }}
          onCancel={closeCreateModal}
        />
      </Modal>
      
      {/* Appointment Details Modal */}
      <Modal
        opened={detailsModalOpen}
        onClose={closeDetailsModal}
        title={t('Appointment Details')}
        size="lg"
      >
        {appointmentToView && (
          <AppointmentDetails
            appointmentId={appointmentToView}
            onClose={closeDetailsModal}
            onStatusChange={handleStatusChange}
            onDelete={canDelete ? handleDeleteAppointment : undefined}
          />
        )}
      </Modal>
      
      {/* Delete confirmation modal */}
      <ConfirmationModal
        opened={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title={t('Delete Appointment')}
        confirmLabel={t('Delete')}
        confirmColor="red"
        loading={deleteAppointmentMutation.isLoading}
      >
        <Text>{t('Are you sure you want to delete this appointment? This action cannot be undone.')}</Text>
      </ConfirmationModal>
      
      {/* Filter drawer */}
      <AppointmentFilterDrawer
        opened={filtersOpen}
        onClose={toggleFilters}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
        onApply={() => {
          toggleFilters();
          refetch();
        }}
        doctors={doctors?.data || []}
        clinics={clinics?.data || []}
        isDoctor={user?.role === 'DOCTOR'}
      />
    </Container>
  );
};

export default AppointmentsPage;

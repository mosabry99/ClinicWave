import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Group,
  Button,
  TextInput,
  Select,
  Menu,
  ActionIcon,
  Text,
  Paper,
  Stack,
  Badge,
  Pagination,
  Table,
  ScrollArea,
  Divider,
  Modal,
  Tooltip,
  Box,
  Checkbox,
  Flex,
  Grid,
  Alert,
  Skeleton,
  Chip,
  Collapse,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';
import {
  IconSearch,
  IconPlus,
  IconFilter,
  IconFileExport,
  IconFileImport,
  IconDotsVertical,
  IconTrash,
  IconEdit,
  IconEye,
  IconUserPlus,
  IconCalendarPlus,
  IconFileText,
  IconAlertCircle,
  IconChevronDown,
  IconRefresh,
  IconX,
  IconAdjustments,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import { format } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { apiService } from '@/services/api';
import { PatientService } from '@/services/patient.service';
import { ExportService } from '@/services/export.service';
import { ImportService } from '@/services/import.service';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientImportModal } from '@/components/patients/PatientImportModal';
import { PatientFilterDrawer } from '@/components/patients/PatientFilterDrawer';
import { NoDataPlaceholder } from '@/components/NoDataPlaceholder';
import { formatDate } from '@/utils/formatters';
import { Gender } from '@clinicwave/shared';

// Types
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  nationalId: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalHistory: string[];
  allergies: string[];
  createdAt: string;
  updatedAt: string;
  active: boolean;
  lastVisit?: string;
  upcomingAppointment?: {
    id: string;
    date: string;
    doctorName: string;
  };
}

interface FilterState {
  search: string;
  gender: Gender | null;
  ageRange: [number | null, number | null];
  dateRange: [Date | null, Date | null];
  insuranceProvider: string | null;
  active: boolean | null;
  hasUpcomingAppointment: boolean | null;
  city: string | null;
  medicalConditions: string[];
}

const PatientsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    gender: null,
    ageRange: [null, null],
    dateRange: [null, null],
    insuranceProvider: null,
    active: null,
    hasUpcomingAppointment: null,
    city: null,
    medicalConditions: [],
  });
  
  // UI state
  const [filtersOpen, { toggle: toggleFilters }] = useDisclosure(false);
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [importModalOpen, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
  const [advancedSearch, { toggle: toggleAdvancedSearch }] = useDisclosure(false);

  // Permissions
  const canCreate = hasPermission('patients', 'create');
  const canUpdate = hasPermission('patients', 'update');
  const canDelete = hasPermission('patients', 'delete');
  const canExport = hasPermission('patients', 'export');
  const canImport = hasPermission('patients', 'import');
  
  // Fetch patients
  const {
    data: patientsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    ['patients', currentPage, pageSize, sortBy, sortOrder, filters],
    () => PatientService.getPatients({
      page: currentPage,
      limit: pageSize,
      sortBy,
      sortOrder,
      search: filters.search || searchQuery,
      gender: filters.gender || undefined,
      minAge: filters.ageRange[0] || undefined,
      maxAge: filters.ageRange[1] || undefined,
      fromDate: filters.dateRange[0] ? format(filters.dateRange[0], 'yyyy-MM-dd') : undefined,
      toDate: filters.dateRange[1] ? format(filters.dateRange[1], 'yyyy-MM-dd') : undefined,
      insuranceProvider: filters.insuranceProvider || undefined,
      active: filters.active !== null ? filters.active : undefined,
      hasUpcomingAppointment: filters.hasUpcomingAppointment !== null ? filters.hasUpcomingAppointment : undefined,
      city: filters.city || undefined,
      medicalConditions: filters.medicalConditions.length > 0 ? filters.medicalConditions.join(',') : undefined,
    }),
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
    }
  );

  // Delete patient mutation
  const deletePatientMutation = useMutation(
    (id: string) => PatientService.deletePatient(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['patients']);
        notifications.show({
          title: t('Patient Deleted'),
          message: t('The patient has been successfully deleted.'),
          color: 'green',
        });
        setPatientToDelete(null);
        closeDeleteModal();
      },
      onError: (error: any) => {
        notifications.show({
          title: t('Error'),
          message: error.message || t('Failed to delete patient. Please try again.'),
          color: 'red',
        });
      },
    }
  );

  // Export patients mutation
  const exportPatientsMutation = useMutation(
    (format: 'csv' | 'excel' | 'pdf') => ExportService.exportPatients(format, {
      search: filters.search || searchQuery,
      gender: filters.gender || undefined,
      minAge: filters.ageRange[0] || undefined,
      maxAge: filters.ageRange[1] || undefined,
      fromDate: filters.dateRange[0] ? format(filters.dateRange[0], 'yyyy-MM-dd') : undefined,
      toDate: filters.dateRange[1] ? format(filters.dateRange[1], 'yyyy-MM-dd') : undefined,
      insuranceProvider: filters.insuranceProvider || undefined,
      active: filters.active !== null ? filters.active : undefined,
      selectedIds: selectedPatients.length > 0 ? selectedPatients : undefined,
    }),
    {
      onSuccess: (data, variables) => {
        notifications.show({
          title: t('Export Successful'),
          message: t('Patients data has been exported successfully.'),
          color: 'green',
        });
      },
      onError: (error: any) => {
        notifications.show({
          title: t('Export Failed'),
          message: error.message || t('Failed to export patients data. Please try again.'),
          color: 'red',
        });
      },
    }
  );

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
      gender: null,
      ageRange: [null, null],
      dateRange: [null, null],
      insuranceProvider: null,
      active: null,
      hasUpcomingAppointment: null,
      city: null,
      medicalConditions: [],
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

  // Handle delete patient
  const handleDeletePatient = (id: string) => {
    setPatientToDelete(id);
    openDeleteModal();
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (patientToDelete) {
      deletePatientMutation.mutate(patientToDelete);
    }
  };

  // Handle export
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    exportPatientsMutation.mutate(format);
  };

  // Handle bulk actions
  const handleBulkAction = (action: 'delete' | 'export' | 'deactivate' | 'activate') => {
    if (selectedPatients.length === 0) return;

    switch (action) {
      case 'delete':
        // Implement bulk delete
        break;
      case 'export':
        handleExport('excel');
        break;
      case 'deactivate':
        // Implement bulk deactivate
        break;
      case 'activate':
        // Implement bulk activate
        break;
    }
  };

  // Handle row selection
  const handleRowSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPatients(prev => [...prev, id]);
    } else {
      setSelectedPatients(prev => prev.filter(patientId => patientId !== id));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && patientsData?.data) {
      setSelectedPatients(patientsData.data.map(patient => patient.id));
    } else {
      setSelectedPatients([]);
    }
  };

  // Check if all rows are selected
  const allSelected = useMemo(() => {
    if (!patientsData?.data || patientsData.data.length === 0) return false;
    return patientsData.data.every(patient => selectedPatients.includes(patient.id));
  }, [patientsData, selectedPatients]);

  // Check if some rows are selected
  const someSelected = useMemo(() => {
    return selectedPatients.length > 0 && !allSelected;
  }, [selectedPatients, allSelected]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.gender) count++;
    if (filters.ageRange[0] !== null || filters.ageRange[1] !== null) count++;
    if (filters.dateRange[0] !== null || filters.dateRange[1] !== null) count++;
    if (filters.insuranceProvider) count++;
    if (filters.active !== null) count++;
    if (filters.hasUpcomingAppointment !== null) count++;
    if (filters.city) count++;
    if (filters.medicalConditions.length > 0) count++;
    return count;
  }, [filters]);

  // Render table rows
  const renderTableRows = () => {
    if (!patientsData?.data || patientsData.data.length === 0) {
      return (
        <tr>
          <td colSpan={9}>
            <NoDataPlaceholder
              title={t('No patients found')}
              description={t('Try adjusting your search or filters to find what you\'re looking for.')}
              icon={<IconUserPlus size={50} />}
              actionLabel={canCreate ? t('Add New Patient') : undefined}
              onAction={canCreate ? () => navigate('/patients/add') : undefined}
            />
          </td>
        </tr>
      );
    }

    return patientsData.data.map((patient) => (
      <tr key={patient.id}>
        <td>
          <Checkbox
            checked={selectedPatients.includes(patient.id)}
            onChange={(event) => handleRowSelection(patient.id, event.currentTarget.checked)}
          />
        </td>
        <td>
          <Group spacing="sm">
            <Text fw={500} component={Link} to={`/patients/${patient.id}`}>
              {patient.lastName}, {patient.firstName}
            </Text>
            {!patient.active && (
              <Badge color="gray" size="xs">
                {t('Inactive')}
              </Badge>
            )}
          </Group>
        </td>
        <td>{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : '-'}</td>
        <td>{t(patient.gender)}</td>
        <td>{patient.phone || '-'}</td>
        <td>{patient.email || '-'}</td>
        <td>
          {patient.insuranceProvider ? (
            <Group spacing="xs">
              <Text size="sm">{patient.insuranceProvider}</Text>
              <Text size="xs" color="dimmed">#{patient.insurancePolicyNumber}</Text>
            </Group>
          ) : (
            '-'
          )}
        </td>
        <td>{patient.lastVisit ? formatDate(patient.lastVisit) : '-'}</td>
        <td>
          <Group spacing="xs" position="right">
            <Tooltip label={t('View Patient')}>
              <ActionIcon component={Link} to={`/patients/${patient.id}`} color="blue">
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>
            {canUpdate && (
              <Tooltip label={t('Edit Patient')}>
                <ActionIcon component={Link} to={`/patients/${patient.id}/edit`} color="green">
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon>
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item 
                  icon={<IconCalendarPlus size={16} />} 
                  component={Link} 
                  to={`/appointments/new?patientId=${patient.id}`}
                >
                  {t('Schedule Appointment')}
                </Menu.Item>
                <Menu.Item 
                  icon={<IconFileText size={16} />} 
                  component={Link} 
                  to={`/medical-records/create/${patient.id}`}
                >
                  {t('Create Medical Record')}
                </Menu.Item>
                <Menu.Divider />
                {canDelete && (
                  <Menu.Item 
                    icon={<IconTrash size={16} />} 
                    color="red"
                    onClick={() => handleDeletePatient(patient.id)}
                  >
                    {t('Delete Patient')}
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </td>
      </tr>
    ));
  };

  // Render grid view
  const renderGridView = () => {
    if (!patientsData?.data || patientsData.data.length === 0) {
      return (
        <NoDataPlaceholder
          title={t('No patients found')}
          description={t('Try adjusting your search or filters to find what you\'re looking for.')}
          icon={<IconUserPlus size={50} />}
          actionLabel={canCreate ? t('Add New Patient') : undefined}
          onAction={canCreate ? () => navigate('/patients/add') : undefined}
        />
      );
    }

    return (
      <Grid gutter="md">
        {patientsData.data.map((patient) => (
          <Grid.Col key={patient.id} xs={12} sm={6} md={4} lg={3}>
            <PatientCard
              patient={patient}
              selected={selectedPatients.includes(patient.id)}
              onSelect={(checked) => handleRowSelection(patient.id, checked)}
              onDelete={canDelete ? () => handleDeletePatient(patient.id) : undefined}
            />
          </Grid.Col>
        ))}
      </Grid>
    );
  };

  // Loading skeletons
  const renderSkeletons = () => {
    if (viewMode === 'list') {
      return Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          <td><Skeleton height={20} width={20} radius="sm" /></td>
          <td><Skeleton height={20} width={150} radius="sm" /></td>
          <td><Skeleton height={20} width={80} radius="sm" /></td>
          <td><Skeleton height={20} width={60} radius="sm" /></td>
          <td><Skeleton height={20} width={100} radius="sm" /></td>
          <td><Skeleton height={20} width={150} radius="sm" /></td>
          <td><Skeleton height={20} width={120} radius="sm" /></td>
          <td><Skeleton height={20} width={80} radius="sm" /></td>
          <td>
            <Group spacing="xs" position="right">
              <Skeleton height={28} width={28} radius="sm" />
              <Skeleton height={28} width={28} radius="sm" />
              <Skeleton height={28} width={28} radius="sm" />
            </Group>
          </td>
        </tr>
      ));
    } else {
      return (
        <Grid gutter="md">
          {Array.from({ length: 8 }).map((_, index) => (
            <Grid.Col key={index} xs={12} sm={6} md={4} lg={3}>
              <Skeleton height={200} radius="md" />
            </Grid.Col>
          ))}
        </Grid>
      );
    }
  };

  return (
    <Container size="xl" px="xs">
      <Stack spacing="md">
        {/* Header */}
        <Group position="apart">
          <Title order={2}>{t('Patients')}</Title>
          <Group spacing="sm">
            {canCreate && (
              <Button
                leftIcon={<IconPlus size={16} />}
                component={Link}
                to="/patients/add"
              >
                {t('Add Patient')}
              </Button>
            )}
          </Group>
        </Group>

        {/* Search and filters */}
        <Paper p="md" withBorder>
          <Stack spacing="md">
            <Group position="apart">
              <Group spacing="sm" style={{ flex: 1 }}>
                <TextInput
                  placeholder={t('Search patients...')}
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
                <Tooltip label={t('Toggle view')}>
                  <ActionIcon
                    variant="default"
                    onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                  >
                    {viewMode === 'list' ? <IconAdjustments size={16} /> : <IconAdjustments size={16} />}
                  </ActionIcon>
                </Tooltip>
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
                      icon={<IconDownload size={16} />} 
                      onClick={() => handleExport('csv')}
                      disabled={!canExport}
                    >
                      {t('Export as CSV')}
                    </Menu.Item>
                    <Menu.Item 
                      icon={<IconDownload size={16} />} 
                      onClick={() => handleExport('excel')}
                      disabled={!canExport}
                    >
                      {t('Export as Excel')}
                    </Menu.Item>
                    <Menu.Item 
                      icon={<IconDownload size={16} />} 
                      onClick={() => handleExport('pdf')}
                      disabled={!canExport}
                    >
                      {t('Export as PDF')}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item 
                      icon={<IconUpload size={16} />} 
                      onClick={openImportModal}
                      disabled={!canImport}
                    >
                      {t('Import Patients')}
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
                    label={t('Gender')}
                    placeholder={t('Select gender')}
                    clearable
                    data={[
                      { value: 'MALE', label: t('Male') },
                      { value: 'FEMALE', label: t('Female') },
                      { value: 'OTHER', label: t('Other') },
                    ]}
                    value={filters.gender}
                    onChange={(value) => handleFilterChange({ gender: value as Gender | null })}
                  />
                </Grid.Col>
                <Grid.Col span={6} md={3}>
                  <Select
                    label={t('Insurance Provider')}
                    placeholder={t('Select provider')}
                    clearable
                    data={[
                      { value: 'Aetna', label: 'Aetna' },
                      { value: 'Blue Cross', label: 'Blue Cross' },
                      { value: 'Cigna', label: 'Cigna' },
                      { value: 'UnitedHealthcare', label: 'UnitedHealthcare' },
                      { value: 'Medicare', label: 'Medicare' },
                      { value: 'Medicaid', label: 'Medicaid' },
                    ]}
                    value={filters.insuranceProvider}
                    onChange={(value) => handleFilterChange({ insuranceProvider: value })}
                  />
                </Grid.Col>
                <Grid.Col span={6} md={3}>
                  <DatePickerInput
                    type="range"
                    label={t('Registration Date')}
                    placeholder={t('Select date range')}
                    clearable
                    value={filters.dateRange}
                    onChange={(value) => handleFilterChange({ dateRange: value as [Date | null, Date | null] })}
                  />
                </Grid.Col>
                <Grid.Col span={6} md={3}>
                  <Select
                    label={t('Status')}
                    placeholder={t('Select status')}
                    clearable
                    data={[
                      { value: 'true', label: t('Active') },
                      { value: 'false', label: t('Inactive') },
                    ]}
                    value={filters.active === null ? null : String(filters.active)}
                    onChange={(value) => handleFilterChange({ active: value === null ? null : value === 'true' })}
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
                {filters.gender && (
                  <Chip
                    checked={false}
                    variant="filled"
                    size="xs"
                    onDelete={() => handleFilterChange({ gender: null })}
                  >
                    {t('Gender')}: {t(filters.gender)}
                  </Chip>
                )}
                {(filters.ageRange[0] !== null || filters.ageRange[1] !== null) && (
                  <Chip
                    checked={false}
                    variant="filled"
                    size="xs"
                    onDelete={() => handleFilterChange({ ageRange: [null, null] })}
                  >
                    {t('Age')}: {filters.ageRange[0] || '0'}-{filters.ageRange[1] || '∞'}
                  </Chip>
                )}
                {filters.active !== null && (
                  <Chip
                    checked={false}
                    variant="filled"
                    size="xs"
                    onDelete={() => handleFilterChange({ active: null })}
                  >
                    {t('Status')}: {filters.active ? t('Active') : t('Inactive')}
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

        {/* Bulk actions */}
        {selectedPatients.length > 0 && (
          <Paper p="md" withBorder>
            <Group position="apart">
              <Text>
                {t('{{count}} patients selected', { count: selectedPatients.length })}
              </Text>
              <Group spacing="xs">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('export')}
                  disabled={!canExport}
                >
                  {t('Export Selected')}
                </Button>
                <Button 
                  variant="outline" 
                  color="red" 
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  disabled={!canDelete}
                >
                  {t('Delete Selected')}
                </Button>
                <Button 
                  variant="subtle" 
                  size="sm"
                  onClick={() => setSelectedPatients([])}
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
                {error instanceof Error ? error.message : t('An error occurred while fetching patients.')}
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

        {/* Patients list */}
        <Paper p="md" withBorder>
          {isLoading ? (
            viewMode === 'list' ? (
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
                      <th>{t('Name')}</th>
                      <th>{t('Date of Birth')}</th>
                      <th>{t('Gender')}</th>
                      <th>{t('Phone')}</th>
                      <th>{t('Email')}</th>
                      <th>{t('Insurance')}</th>
                      <th>{t('Last Visit')}</th>
                      <th style={{ width: 120 }}>{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>{renderSkeletons()}</tbody>
                </Table>
              </ScrollArea>
            ) : (
              renderSkeletons()
            )
          ) : viewMode === 'list' ? (
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
                      onClick={() => handleSortChange('lastName')}
                    >
                      <Group spacing={5}>
                        {t('Name')}
                        {sortBy === 'lastName' && (
                          sortOrder === 'asc' ? '↑' : '↓'
                        )}
                      </Group>
                    </th>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSortChange('dateOfBirth')}
                    >
                      <Group spacing={5}>
                        {t('Date of Birth')}
                        {sortBy === 'dateOfBirth' && (
                          sortOrder === 'asc' ? '↑' : '↓'
                        )}
                      </Group>
                    </th>
                    <th>{t('Gender')}</th>
                    <th>{t('Phone')}</th>
                    <th>{t('Email')}</th>
                    <th>{t('Insurance')}</th>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSortChange('lastVisit')}
                    >
                      <Group spacing={5}>
                        {t('Last Visit')}
                        {sortBy === 'lastVisit' && (
                          sortOrder === 'asc' ? '↑' : '↓'
                        )}
                      </Group>
                    </th>
                    <th style={{ width: 120 }}>{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>{renderTableRows()}</tbody>
              </Table>
            </ScrollArea>
          ) : (
            renderGridView()
          )}

          {/* Pagination */}
          {patientsData?.meta && patientsData.meta.totalPages > 1 && (
            <Group position="apart" mt="md">
              <Text size="sm" color="dimmed">
                {t('Showing {{from}} to {{to}} of {{total}} patients', {
                  from: (currentPage - 1) * pageSize + 1,
                  to: Math.min(currentPage * pageSize, patientsData.meta.total),
                  total: patientsData.meta.total,
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
                  total={patientsData.meta.totalPages}
                  page={currentPage}
                  onChange={setCurrentPage}
                  withEdges
                />
              </Group>
            </Group>
          )}
        </Paper>
      </Stack>

      {/* Delete confirmation modal */}
      <ConfirmationModal
        opened={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title={t('Delete Patient')}
        confirmLabel={t('Delete')}
        confirmColor="red"
        loading={deletePatientMutation.isLoading}
      >
        <Text>{t('Are you sure you want to delete this patient? This action cannot be undone.')}</Text>
      </ConfirmationModal>

      {/* Import modal */}
      <PatientImportModal
        opened={importModalOpen}
        onClose={closeImportModal}
        onSuccess={() => {
          closeImportModal();
          refetch();
        }}
      />

      {/* Filter drawer */}
      <PatientFilterDrawer
        opened={filtersOpen}
        onClose={toggleFilters}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
        onApply={() => {
          toggleFilters();
          refetch();
        }}
      />
    </Container>
  );
};

export default PatientsPage;

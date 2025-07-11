import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Paper,
  Text,
  Title,
  Group,
  Stack,
  Skeleton,
  Badge,
  SimpleGrid,
  Card,
  RingProgress,
  useMantineTheme,
  ThemeIcon,
  Center,
  Button,
  ActionIcon,
  Tooltip,
  Alert,
  Box,
  Divider,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconUsers,
  IconCurrencyDollar,
  IconChartBar,
  IconAlertCircle,
  IconRefresh,
  IconArrowUpRight,
  IconArrowDownRight,
  IconSettings,
  IconClock,
  IconUserCheck,
  IconUserX,
  IconCalendarStats,
  IconBuildingHospital,
  IconHeartRateMonitor,
  IconReportMedical,
  IconChartPie,
  IconChevronRight,
  IconDots,
} from '@tabler/icons-react';
import { UserRole } from '@clinicwave/shared';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { DashboardService } from '@/services/dashboard.service';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';
import { AppointmentStatus } from '@/types/appointments';
import { getStatusColor } from '@/utils/statusColors';
import { LineChart, BarChart, PieChart } from '@/components/charts';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { AppointmentList } from '@/components/appointments/AppointmentList';
import { PatientList } from '@/components/patients/PatientList';
import { WaitingRoomWidget } from '@/components/dashboard/WaitingRoomWidget';
import { DashboardWidgetWrapper } from '@/components/dashboard/DashboardWidgetWrapper';
import { WidgetSkeleton } from '@/components/dashboard/WidgetSkeleton';
import { DoctorPerformanceWidget } from '@/components/dashboard/DoctorPerformanceWidget';
import { PatientDemographicsWidget } from '@/components/dashboard/PatientDemographicsWidget';
import { FinancialSummaryWidget } from '@/components/dashboard/FinancialSummaryWidget';
import { PendingTasksWidget } from '@/components/dashboard/PendingTasksWidget';
import { ClinicUtilizationWidget } from '@/components/dashboard/ClinicUtilizationWidget';
import { SystemHealthWidget } from '@/components/dashboard/SystemHealthWidget';

interface DashboardData {
  kpis?: {
    appointments: {
      today: number;
      completed: number;
      noShows: number;
      noShowRate: number;
      completionRate: number;
      monthly: number;
    };
    patients: {
      active: number;
      newToday: number;
      newThisMonth: number;
    };
    financial: {
      pendingInvoices: number;
      revenueToday: number;
      revenueMonth: number;
    };
    date: string;
  };
  appointmentTrends?: any;
  financialTrends?: any;
  patientDemographics?: any;
  doctorPerformance?: any;
  clinicUtilization?: any;
  systemHealth?: any;
  todaySchedule?: {
    date: string;
    totalAppointments: number;
    byStatus: Record<AppointmentStatus, any[]>;
    byHour: Record<string, any[]>;
    appointments: any[];
  };
  pendingTasks?: {
    pendingAppointments: number;
    pendingInvoices: number;
    pendingLabResults: number;
    pendingPrescriptions: number;
    pendingMessages: number;
    pendingReferrals: number;
  };
  personalPerformance?: any;
  patientStats?: any;
  appointmentStats?: any;
  waitingRoomStatus?: any;
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });
  const [clinicId, setClinicId] = useState<string | undefined>(user?.clinicId);

  // Fetch dashboard data based on user role
  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DashboardData>(
    ['dashboard', user?.role, clinicId, dateRange],
    async () => {
      const response = await DashboardService.getDashboardData(clinicId, {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      return response.data;
    },
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Determine which widgets to show based on user role
  const getWidgetsForRole = () => {
    if (!user) return [];

    switch (user.role) {
      case UserRole.OWNER:
      case UserRole.ADMIN:
        return [
          { id: 'kpis', type: 'kpi-summary', size: 12 },
          { id: 'appointments', type: 'appointment-trends', size: 6 },
          { id: 'revenue', type: 'financial-trends', size: 6 },
          { id: 'demographics', type: 'patient-demographics', size: 4 },
          { id: 'doctors', type: 'doctor-performance', size: 4 },
          { id: 'utilization', type: 'clinic-utilization', size: 4 },
          { id: 'schedule', type: 'today-schedule', size: 8 },
          { id: 'waiting-room', type: 'waiting-room', size: 4 },
          { id: 'system-health', type: 'system-health', size: 12 },
        ];
      case UserRole.DOCTOR:
        return [
          { id: 'schedule', type: 'today-schedule', size: 8 },
          { id: 'tasks', type: 'pending-tasks', size: 4 },
          { id: 'performance', type: 'personal-performance', size: 6 },
          { id: 'patients', type: 'patient-demographics', size: 6 },
          { id: 'appointments', type: 'appointment-trends', size: 12 },
        ];
      case UserRole.NURSE:
        return [
          { id: 'schedule', type: 'today-schedule', size: 8 },
          { id: 'tasks', type: 'pending-tasks', size: 4 },
          { id: 'patients', type: 'patient-stats', size: 6 },
          { id: 'waiting-room', type: 'waiting-room', size: 6 },
        ];
      case UserRole.RECEPTIONIST:
        return [
          { id: 'waiting-room', type: 'waiting-room', size: 6 },
          { id: 'schedule', type: 'today-schedule', size: 6 },
          { id: 'appointments', type: 'appointment-stats', size: 12 },
        ];
      default:
        return [
          { id: 'schedule', type: 'today-schedule', size: 12 },
          { id: 'appointments', type: 'appointment-stats', size: 12 },
        ];
    }
  };

  const widgets = getWidgetsForRole();

  // Render KPI summary widget
  const renderKpiSummary = () => {
    if (!dashboardData?.kpis) {
      return (
        <SimpleGrid cols={3} spacing="md" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
          <WidgetSkeleton height={120} />
          <WidgetSkeleton height={120} />
          <WidgetSkeleton height={120} />
        </SimpleGrid>
      );
    }

    const { appointments, patients, financial } = dashboardData.kpis;

    return (
      <SimpleGrid cols={3} spacing="md" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        <KpiCard
          title={t('Appointments')}
          value={appointments.today}
          subtitle={t('Today')}
          icon={<IconCalendarEvent size={28} />}
          color="blue"
          trend={{
            value: appointments.completionRate,
            label: t('Completion rate'),
            isPositive: appointments.completionRate >= 70,
          }}
          stats={[
            { label: t('Completed'), value: appointments.completed },
            { label: t('No-shows'), value: appointments.noShows },
          ]}
        />
        <KpiCard
          title={t('Patients')}
          value={patients.active}
          subtitle={t('Active patients')}
          icon={<IconUsers size={28} />}
          color="green"
          trend={{
            value: patients.newToday,
            label: t('New today'),
            isPositive: true,
          }}
          stats={[
            { label: t('New this month'), value: patients.newThisMonth },
          ]}
        />
        <KpiCard
          title={t('Revenue')}
          value={formatCurrency(financial.revenueToday)}
          subtitle={t('Today')}
          icon={<IconCurrencyDollar size={28} />}
          color="violet"
          trend={{
            value: financial.pendingInvoices,
            label: t('Pending invoices'),
            isPositive: false,
          }}
          stats={[
            { label: t('Monthly'), value: formatCurrency(financial.revenueMonth) },
          ]}
        />
      </SimpleGrid>
    );
  };

  // Render appointment trends widget
  const renderAppointmentTrends = () => {
    if (!dashboardData?.appointmentTrends) {
      return <WidgetSkeleton height={300} />;
    }

    const { data, labels } = dashboardData.appointmentTrends;

    return (
      <Box>
        <LineChart
          title={t('Appointment Trends')}
          data={data}
          labels={labels}
          height={300}
          colors={['blue', 'green', 'red']}
          series={[
            { name: t('Scheduled'), color: theme.colors.blue[6] },
            { name: t('Completed'), color: theme.colors.green[6] },
            { name: t('No-shows'), color: theme.colors.red[6] },
          ]}
        />
      </Box>
    );
  };

  // Render financial trends widget
  const renderFinancialTrends = () => {
    if (!dashboardData?.financialTrends) {
      return <WidgetSkeleton height={300} />;
    }

    const { data, labels } = dashboardData.financialTrends;

    return (
      <Box>
        <BarChart
          title={t('Revenue Trends')}
          data={data}
          labels={labels}
          height={300}
          colors={['indigo', 'cyan']}
          series={[
            { name: t('Revenue'), color: theme.colors.indigo[6] },
            { name: t('Expenses'), color: theme.colors.cyan[6] },
          ]}
        />
      </Box>
    );
  };

  // Render today's schedule widget
  const renderTodaySchedule = () => {
    if (!dashboardData?.todaySchedule) {
      return <WidgetSkeleton height={400} />;
    }

    const { appointments, totalAppointments, date } = dashboardData.todaySchedule;

    return (
      <Box>
        <Group position="apart" mb="md">
          <Title order={4}>{t('Today\'s Schedule')}</Title>
          <Badge size="lg">{totalAppointments} {t('appointments')}</Badge>
        </Group>
        <AppointmentList
          appointments={appointments}
          compact
          maxItems={5}
          showViewAll
          viewAllLink="/appointments"
        />
      </Box>
    );
  };

  // Render waiting room widget
  const renderWaitingRoom = () => {
    if (!dashboardData?.waitingRoomStatus) {
      return <WidgetSkeleton height={400} />;
    }

    return <WaitingRoomWidget data={dashboardData.waitingRoomStatus} />;
  };

  // Render pending tasks widget
  const renderPendingTasks = () => {
    if (!dashboardData?.pendingTasks) {
      return <WidgetSkeleton height={300} />;
    }

    return <PendingTasksWidget tasks={dashboardData.pendingTasks} />;
  };

  // Render patient demographics widget
  const renderPatientDemographics = () => {
    if (!dashboardData?.patientDemographics) {
      return <WidgetSkeleton height={300} />;
    }

    return <PatientDemographicsWidget data={dashboardData.patientDemographics} />;
  };

  // Render doctor performance widget
  const renderDoctorPerformance = () => {
    if (!dashboardData?.doctorPerformance) {
      return <WidgetSkeleton height={300} />;
    }

    return <DoctorPerformanceWidget data={dashboardData.doctorPerformance} />;
  };

  // Render personal performance widget (for doctors)
  const renderPersonalPerformance = () => {
    if (!dashboardData?.personalPerformance) {
      return <WidgetSkeleton height={300} />;
    }

    return <DoctorPerformanceWidget data={dashboardData.personalPerformance} personal />;
  };

  // Render clinic utilization widget
  const renderClinicUtilization = () => {
    if (!dashboardData?.clinicUtilization) {
      return <WidgetSkeleton height={300} />;
    }

    return <ClinicUtilizationWidget data={dashboardData.clinicUtilization} />;
  };

  // Render system health widget
  const renderSystemHealth = () => {
    if (!dashboardData?.systemHealth) {
      return <WidgetSkeleton height={200} />;
    }

    return <SystemHealthWidget data={dashboardData.systemHealth} />;
  };

  // Render appointment stats widget
  const renderAppointmentStats = () => {
    if (!dashboardData?.appointmentStats) {
      return <WidgetSkeleton height={300} />;
    }

    const { byStatus, byDoctor } = dashboardData.appointmentStats;

    return (
      <SimpleGrid cols={2} spacing="md" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        <Card p="md" radius="md" withBorder>
          <Title order={5} mb="md">{t('Appointments by Status')}</Title>
          <PieChart
            data={Object.entries(byStatus).map(([status, count]) => ({
              name: status,
              value: count as number,
              color: getStatusColor(status as AppointmentStatus),
            }))}
            height={200}
          />
        </Card>
        <Card p="md" radius="md" withBorder>
          <Title order={5} mb="md">{t('Appointments by Doctor')}</Title>
          <BarChart
            data={byDoctor.map((item: any) => item.count)}
            labels={byDoctor.map((item: any) => item.doctor.lastName)}
            height={200}
            horizontal
          />
        </Card>
      </SimpleGrid>
    );
  };

  // Render patient stats widget
  const renderPatientStats = () => {
    if (!dashboardData?.patientStats) {
      return <WidgetSkeleton height={300} />;
    }

    const { recentPatients } = dashboardData.patientStats;

    return (
      <Box>
        <Title order={4} mb="md">{t('Recent Patients')}</Title>
        <PatientList
          patients={recentPatients}
          compact
          maxItems={5}
          showViewAll
          viewAllLink="/patients"
        />
      </Box>
    );
  };

  // Map widget types to their render functions
  const widgetRenderers: Record<string, () => JSX.Element> = {
    'kpi-summary': renderKpiSummary,
    'appointment-trends': renderAppointmentTrends,
    'financial-trends': renderFinancialTrends,
    'today-schedule': renderTodaySchedule,
    'waiting-room': renderWaitingRoom,
    'pending-tasks': renderPendingTasks,
    'patient-demographics': renderPatientDemographics,
    'doctor-performance': renderDoctorPerformance,
    'personal-performance': renderPersonalPerformance,
    'clinic-utilization': renderClinicUtilization,
    'system-health': renderSystemHealth,
    'appointment-stats': renderAppointmentStats,
    'patient-stats': renderPatientStats,
  };

  if (isError) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title={t('Error loading dashboard')}
        color="red"
        mb="md"
      >
        <Stack spacing="md">
          <Text>{t('Failed to load dashboard data. Please try again.')}</Text>
          <Button
            leftIcon={<IconRefresh size={16} />}
            onClick={() => refetch()}
            variant="outline"
            color="red"
          >
            {t('Retry')}
          </Button>
        </Stack>
      </Alert>
    );
  }

  return (
    <Stack spacing="lg">
      <Group position="apart">
        <Title order={2}>{t('Dashboard')}</Title>
        <Group>
          <Button
            variant="light"
            leftIcon={<IconRefresh size={16} />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            {t('Refresh')}
          </Button>
          <Button
            variant="outline"
            leftIcon={<IconSettings size={16} />}
            component="a"
            href="/settings/dashboard"
          >
            {t('Customize')}
          </Button>
        </Group>
      </Group>

      <Grid gutter="md">
        {widgets.map((widget) => (
          <Grid.Col key={widget.id} md={widget.size as any}>
            <DashboardWidgetWrapper
              title={t(widget.id)}
              isLoading={isLoading}
            >
              {widgetRenderers[widget.type]?.() || <Text>Widget not found</Text>}
            </DashboardWidgetWrapper>
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
};

export default DashboardPage;

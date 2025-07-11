import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Button,
  Grid,
  Card,
  Image,
  Badge,
  Group,
  ThemeIcon,
  List,
  Accordion,
  Tabs,
  Box,
  Paper,
  SimpleGrid,
  Divider,
  Center,
  Stack,
  Anchor,
  useMantineTheme,
  createStyles,
  rem,
  Overlay,
  ActionIcon,
  Transition,
  Affix,
} from '@mantine/core';
import { useMediaQuery, useWindowScroll } from '@mantine/hooks';
import {
  IconStethoscope,
  IconCalendar,
  IconReportMedical,
  IconCreditCard,
  IconBell,
  IconDeviceMobile,
  IconCloudComputing,
  IconLock,
  IconChartBar,
  IconUsers,
  IconLanguage,
  IconArrowUp,
  IconBrandWhatsapp,
  IconBrandFacebook,
  IconBrandTwitter,
  IconBrandInstagram,
  IconCheck,
  IconX,
  IconChevronRight,
} from '@tabler/icons-react';

// Create styles for the landing page
const useStyles = createStyles((theme) => ({
  wrapper: {
    position: 'relative',
    boxSizing: 'border-box',
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
  },

  inner: {
    position: 'relative',
    paddingTop: rem(120),
    paddingBottom: rem(120),

    [theme.fn.smallerThan('sm')]: {
      paddingTop: rem(80),
      paddingBottom: rem(80),
    },
  },

  title: {
    fontWeight: 800,
    fontSize: rem(40),
    letterSpacing: -1,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,

    [theme.fn.smallerThan('xs')]: {
      fontSize: rem(28),
      textAlign: 'left',
    },
  },

  highlight: {
    color: theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 4 : 6],
  },

  description: {
    textAlign: 'center',
    maxWidth: 600,
    margin: '0 auto',

    [theme.fn.smallerThan('xs')]: {
      textAlign: 'left',
      fontSize: theme.fontSizes.md,
    },
  },

  controls: {
    marginTop: theme.spacing.xl * 1.5,
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing.md,

    [theme.fn.smallerThan('xs')]: {
      flexDirection: 'column',
    },
  },

  control: {
    fontWeight: 600,
    fontSize: theme.fontSizes.md,
    height: 52,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,

    [theme.fn.smallerThan('xs')]: {
      width: '100%',
    },
  },

  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '50%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    borderRadius: theme.radius.md,
    boxShadow: theme.shadows.lg,

    [theme.fn.smallerThan('sm')]: {
      display: 'none',
    },
  },

  section: {
    padding: theme.spacing.xl * 2,
    
    [theme.fn.smallerThan('sm')]: {
      padding: theme.spacing.xl,
    },
  },

  sectionTitle: {
    fontSize: rem(34),
    fontWeight: 900,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,

    [theme.fn.smallerThan('sm')]: {
      fontSize: rem(24),
    },
  },

  sectionDescription: {
    maxWidth: 600,
    margin: '0 auto',
    marginBottom: theme.spacing.xl * 1.5,
    textAlign: 'center',
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[7],
  },

  featureCard: {
    border: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
    transition: 'transform 150ms ease, box-shadow 150ms ease',

    '&:hover': {
      transform: 'scale(1.01)',
      boxShadow: theme.shadows.md,
    },
  },

  featureIcon: {
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },

  featureTitle: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontWeight: 700,
  },

  pricingCard: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    border: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 150ms ease, box-shadow 150ms ease',

    '&:hover': {
      transform: 'scale(1.01)',
      boxShadow: theme.shadows.md,
    },
  },

  pricingPopular: {
    backgroundColor: theme.colors[theme.primaryColor][0],
    borderColor: theme.colors[theme.primaryColor][6],
  },

  pricingHeader: {
    position: 'relative',
    padding: theme.spacing.lg,
    borderBottom: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
  },

  pricingHeaderPopular: {
    backgroundColor: theme.colors[theme.primaryColor][6],
    color: theme.white,
  },

  pricingTitle: {
    fontWeight: 700,
    fontSize: rem(26),
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
  },

  pricingPrice: {
    fontSize: rem(42),
    fontWeight: 700,
    display: 'flex',
    alignItems: 'flex-end',
    lineHeight: 1,
  },

  pricingMonth: {
    fontSize: rem(16),
    fontWeight: 500,
    marginLeft: rem(5),
    marginBottom: rem(5),
  },

  pricingButton: {
    marginTop: theme.spacing.xl,
    display: 'block',
    width: '100%',
    height: 42,
  },

  testimonialCard: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
    border: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
  },

  testimonialQuote: {
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
  },

  testimonialAvatar: {
    border: `${rem(2)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
  },

  footer: {
    marginTop: rem(120),
    paddingTop: theme.spacing.xl * 2,
    paddingBottom: theme.spacing.xl * 2,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    borderTop: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
  },

  logo: {
    maxWidth: rem(200),
    display: 'block',
    marginBottom: theme.spacing.md,

    [theme.fn.smallerThan('sm')]: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
  },

  footerTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: 700,
    marginBottom: theme.spacing.xs,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
  },

  afterFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    borderTop: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
    }`,

    [theme.fn.smallerThan('sm')]: {
      flexDirection: 'column',
    },
  },

  social: {
    [theme.fn.smallerThan('sm')]: {
      marginTop: theme.spacing.xs,
    },
  },
}));

// Feature data
const features = [
  {
    icon: <IconStethoscope size={28} />,
    title: 'Patient Management',
    description: 'Comprehensive patient records with medical history, allergies, and secure PHI encryption.',
    color: 'blue',
  },
  {
    icon: <IconCalendar size={28} />,
    title: 'Smart Scheduling',
    description: 'Intelligent appointment booking with conflict detection and automated reminders.',
    color: 'green',
  },
  {
    icon: <IconReportMedical size={28} />,
    title: 'Medical Records',
    description: 'Digital clinical documentation with vital signs tracking and file attachments.',
    color: 'teal',
  },
  {
    icon: <IconCreditCard size={28} />,
    title: 'Billing & Invoicing',
    description: 'Multiple payment gateways, automated pricing, and financial analytics.',
    color: 'violet',
  },
  {
    icon: <IconBell size={28} />,
    title: 'Smart Notifications',
    description: 'Multi-channel alerts via email, SMS, push, and in-app messaging.',
    color: 'orange',
  },
  {
    icon: <IconChartBar size={28} />,
    title: 'Analytics Dashboard',
    description: 'Real-time insights with customizable KPIs and performance metrics.',
    color: 'indigo',
  },
  {
    icon: <IconDeviceMobile size={28} />,
    title: 'Mobile Access',
    description: 'Progressive Web App with offline capabilities for anywhere access.',
    color: 'pink',
  },
  {
    icon: <IconLanguage size={28} />,
    title: 'Multilingual',
    description: 'Full Arabic and English language support with RTL interface.',
    color: 'cyan',
  },
];

// Pricing plans
const pricingPlans = [
  {
    title: 'Basic',
    price: 49,
    features: [
      { included: true, text: 'Up to 500 patients' },
      { included: true, text: 'Calendar & scheduling' },
      { included: true, text: 'Basic medical records' },
      { included: true, text: 'Email notifications' },
      { included: false, text: 'SMS notifications' },
      { included: false, text: 'Advanced analytics' },
      { included: false, text: 'Multi-clinic support' },
      { included: false, text: 'Custom branding' },
    ],
    cta: 'Start with Basic',
    popular: false,
  },
  {
    title: 'Professional',
    price: 99,
    features: [
      { included: true, text: 'Up to 2,000 patients' },
      { included: true, text: 'Advanced scheduling' },
      { included: true, text: 'Complete medical records' },
      { included: true, text: 'Email & SMS notifications' },
      { included: true, text: 'Basic analytics' },
      { included: true, text: 'Multi-clinic support' },
      { included: false, text: 'Custom branding' },
      { included: false, text: 'API access' },
    ],
    cta: 'Start with Professional',
    popular: true,
  },
  {
    title: 'Enterprise',
    price: 199,
    features: [
      { included: true, text: 'Unlimited patients' },
      { included: true, text: 'Smart scheduling' },
      { included: true, text: 'Advanced medical records' },
      { included: true, text: 'All notification channels' },
      { included: true, text: 'Advanced analytics' },
      { included: true, text: 'Multi-clinic support' },
      { included: true, text: 'Custom branding' },
      { included: true, text: 'API access' },
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

// FAQ items
const faqItems = [
  {
    question: 'How secure is ClinicWave for storing patient data?',
    answer: 'ClinicWave implements military-grade encryption for all PHI (Protected Health Information) using AES-256 encryption. We are fully HIPAA compliant and implement role-based access controls, audit logging, and secure data backups to ensure your patient data remains protected.',
  },
  {
    question: 'Can I use ClinicWave on my mobile device?',
    answer: 'Yes! ClinicWave is built as a Progressive Web App (PWA) that works on any device with a modern web browser. You can install it on your smartphone or tablet for quick access, and it even works offline when you don\'t have an internet connection.',
  },
  {
    question: 'Does ClinicWave support multiple clinics or locations?',
    answer: 'Absolutely. Our Professional and Enterprise plans include multi-clinic support. You can manage different locations, each with their own staff, schedules, and patients, all from a single dashboard with consolidated reporting.',
  },
  {
    question: 'What payment methods do you support?',
    answer: 'ClinicWave integrates with multiple payment gateways including Stripe, PayPal, FawryPay, and Polar.sh. You can accept credit cards, bank transfers, and local payment methods depending on your region.',
  },
  {
    question: 'Is there a contract or can I cancel anytime?',
    answer: 'We offer both monthly and annual billing options. You can cancel your subscription at any time, though we do offer significant discounts for annual commitments. There are no long-term contracts required.',
  },
  {
    question: 'How do I migrate my existing patient data to ClinicWave?',
    answer: 'We provide a comprehensive data migration service for new customers. Our team will help you import patient records, appointments, and other essential data from your previous system. We support imports from most major clinic management systems and can also work with CSV files.',
  },
];

// Testimonials
const testimonials = [
  {
    quote: "ClinicWave has transformed how we run our multi-location practice. The scheduling system alone has reduced no-shows by 35%.",
    name: "Dr. Sarah Johnson",
    title: "Medical Director, Family Care Clinic",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=250&q=80",
  },
  {
    quote: "The bilingual support is fantastic. Our staff can work in English while our patients receive communications in Arabic.",
    name: "Dr. Ahmed Hassan",
    title: "Owner, Cairo Medical Center",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=250&q=80",
  },
  {
    quote: "The offline capabilities ensure we never lose access to critical patient information, even when our internet connection is unstable.",
    name: "Fatima Al-Mansoori",
    title: "Practice Manager, Gulf Health Clinic",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=250&q=80",
  },
];

const LandingPage = () => {
  const { classes, cx } = useStyles();
  const { t, i18n } = useTranslation();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const [scroll, scrollTo] = useWindowScroll();

  // Stats section data
  const stats = [
    { value: '30+', label: t('Countries') },
    { value: '2,000+', label: t('Clinics') },
    { value: '10M+', label: t('Patients Managed') },
    { value: '99.9%', label: t('Uptime') },
  ];

  return (
    <Box className={classes.wrapper}>
      {/* Hero Section */}
      <Box 
        sx={(theme) => ({
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.blue[0],
          position: 'relative',
          overflow: 'hidden',
        })}
      >
        <Container size="xl" className={classes.inner}>
          <Grid gutter={50}>
            <Grid.Col md={6}>
              <Title className={classes.title}>
                {t('Modern Clinic Management for the')} <span className={classes.highlight}>{t('Digital Age')}</span>
              </Title>
              <Text size="lg" color="dimmed" className={classes.description} mt="md">
                {t('ClinicWave streamlines your medical practice with smart scheduling, secure patient records, and integrated billing – all in a multilingual platform that works online and offline.')}
              </Text>

              <Group className={classes.controls}>
                <Button 
                  size="xl" 
                  className={classes.control} 
                  variant="gradient" 
                  gradient={{ from: 'blue', to: 'cyan' }}
                  component={Link}
                  to="/register"
                >
                  {t('Start Free Trial')}
                </Button>
                <Button 
                  size="xl" 
                  className={classes.control} 
                  variant="default" 
                  component={Link}
                  to="/demo"
                >
                  {t('Request Demo')}
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
          <Image 
            src="/assets/images/hero-dashboard.png" 
            alt="ClinicWave Dashboard" 
            className={classes.heroImage}
          />
        </Container>
      </Box>

      {/* Stats Section */}
      <Container size="xl" py="xl">
        <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'sm', cols: 2 }]} spacing={50}>
          {stats.map((stat, index) => (
            <Box key={index} ta="center">
              <Text fz={32} fw={700} className={classes.highlight}>{stat.value}</Text>
              <Text fz="sm" c="dimmed">{stat.label}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>

      {/* Features Section */}
      <Box className={classes.section}>
        <Container size="xl">
          <Title className={classes.sectionTitle}>
            {t('Everything You Need to Run Your Clinic')}
          </Title>
          <Text className={classes.sectionDescription}>
            {t('ClinicWave combines all essential tools for modern healthcare practices in one integrated platform.')}
          </Text>

          <SimpleGrid
            cols={4}
            spacing="xl"
            breakpoints={[
              { maxWidth: 'md', cols: 2 },
              { maxWidth: 'xs', cols: 1 },
            ]}
          >
            {features.map((feature, index) => (
              <Card key={index} padding="lg" radius="md" className={classes.featureCard}>
                <ThemeIcon size={60} radius="md" color={feature.color} className={classes.featureIcon}>
                  {feature.icon}
                </ThemeIcon>
                <Text fz="lg" fw={500} className={classes.featureTitle} mt="md">
                  {t(feature.title)}
                </Text>
                <Text fz="sm" c="dimmed" mt="sm">
                  {t(feature.description)}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box 
        className={classes.section}
        sx={(theme) => ({
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        })}
      >
        <Container size="xl">
          <Title className={classes.sectionTitle}>
            {t('How ClinicWave Works')}
          </Title>
          <Text className={classes.sectionDescription}>
            {t('Our platform simplifies every aspect of clinic management from patient intake to billing.')}
          </Text>

          <SimpleGrid
            cols={3}
            spacing="xl"
            breakpoints={[
              { maxWidth: 'md', cols: 1 },
            ]}
          >
            <Box>
              <ThemeIcon size={60} radius="md" color="blue" mb="md">
                <IconUsers size={30} />
              </ThemeIcon>
              <Title order={3} mb="xs">{t('Patient Management')}</Title>
              <Text mb="md">
                {t('Securely store patient information, medical history, and documents with HIPAA-compliant encryption.')}
              </Text>
              <List
                spacing="sm"
                size="sm"
                icon={
                  <ThemeIcon color="blue" size={24} radius="xl">
                    <IconCheck size={16} />
                  </ThemeIcon>
                }
              >
                <List.Item>{t('Digital patient records')}</List.Item>
                <List.Item>{t('Secure PHI encryption')}</List.Item>
                <List.Item>{t('Document management')}</List.Item>
                <List.Item>{t('Patient portal access')}</List.Item>
              </List>
            </Box>

            <Box>
              <ThemeIcon size={60} radius="md" color="green" mb="md">
                <IconCalendar size={30} />
              </ThemeIcon>
              <Title order={3} mb="xs">{t('Appointments & Workflow')}</Title>
              <Text mb="md">
                {t('Streamline scheduling with smart conflict detection, automated reminders, and waiting room management.')}
              </Text>
              <List
                spacing="sm"
                size="sm"
                icon={
                  <ThemeIcon color="green" size={24} radius="xl">
                    <IconCheck size={16} />
                  </ThemeIcon>
                }
              >
                <List.Item>{t('Intelligent scheduling')}</List.Item>
                <List.Item>{t('Automated reminders')}</List.Item>
                <List.Item>{t('Real-time updates')}</List.Item>
                <List.Item>{t('Resource optimization')}</List.Item>
              </List>
            </Box>

            <Box>
              <ThemeIcon size={60} radius="md" color="violet" mb="md">
                <IconCreditCard size={30} />
              </ThemeIcon>
              <Title order={3} mb="xs">{t('Billing & Analytics')}</Title>
              <Text mb="md">
                {t('Simplify financial operations with integrated payments, insurance processing, and performance insights.')}
              </Text>
              <List
                spacing="sm"
                size="sm"
                icon={
                  <ThemeIcon color="violet" size={24} radius="xl">
                    <IconCheck size={16} />
                  </ThemeIcon>
                }
              >
                <List.Item>{t('Multiple payment gateways')}</List.Item>
                <List.Item>{t('Automated invoicing')}</List.Item>
                <List.Item>{t('Insurance claim management')}</List.Item>
                <List.Item>{t('Financial reporting')}</List.Item>
              </List>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box className={classes.section}>
        <Container size="xl">
          <Title className={classes.sectionTitle}>
            {t('Trusted by Healthcare Professionals')}
          </Title>
          <Text className={classes.sectionDescription}>
            {t('See what medical professionals around the world say about ClinicWave.')}
          </Text>

          <SimpleGrid
            cols={3}
            spacing="xl"
            breakpoints={[
              { maxWidth: 'md', cols: 2 },
              { maxWidth: 'sm', cols: 1 },
            ]}
          >
            {testimonials.map((testimonial, index) => (
              <Card key={index} className={classes.testimonialCard} shadow="sm">
                <Text size="lg" className={classes.testimonialQuote}>
                  "{t(testimonial.quote)}"
                </Text>
                <Group>
                  <Image
                    src={testimonial.avatar}
                    width={48}
                    height={48}
                    radius="xl"
                    className={classes.testimonialAvatar}
                  />
                  <div>
                    <Text size="sm" fw={500}>
                      {testimonial.name}
                    </Text>
                    <Text size="xs" color="dimmed">
                      {testimonial.title}
                    </Text>
                  </div>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box 
        className={classes.section}
        sx={(theme) => ({
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        })}
        id="pricing"
      >
        <Container size="xl">
          <Title className={classes.sectionTitle}>
            {t('Simple, Transparent Pricing')}
          </Title>
          <Text className={classes.sectionDescription}>
            {t('Choose the plan that works best for your practice. All plans include our core features.')}
          </Text>

          <Tabs defaultValue="monthly">
            <Tabs.List position="center" mb="xl">
              <Tabs.Tab value="monthly">{t('Monthly Billing')}</Tabs.Tab>
              <Tabs.Tab value="annual">{t('Annual Billing')} <Badge ml={5} variant="filled" size="sm">{t('Save 20%')}</Badge></Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="monthly">
              <SimpleGrid
                cols={3}
                spacing="xl"
                breakpoints={[
                  { maxWidth: 'md', cols: 2 },
                  { maxWidth: 'sm', cols: 1 },
                ]}
              >
                {pricingPlans.map((plan, index) => (
                  <Card 
                    key={index} 
                    padding="lg" 
                    radius="md" 
                    className={cx(classes.pricingCard, { [classes.pricingPopular]: plan.popular })}
                  >
                    {plan.popular && (
                      <Badge 
                        variant="filled" 
                        sx={{ position: 'absolute', top: 10, right: 10 }}
                      >
                        {t('Most Popular')}
                      </Badge>
                    )}
                    <Card.Section 
                      className={cx(classes.pricingHeader, { [classes.pricingHeaderPopular]: plan.popular })}
                    >
                      <Text className={classes.pricingTitle}>{t(plan.title)}</Text>
                      <div className={classes.pricingPrice}>
                        ${plan.price}
                        <Text className={classes.pricingMonth}>{t('/month')}</Text>
                      </div>
                    </Card.Section>

                    <List
                      spacing="sm"
                      size="sm"
                      mt="md"
                      center
                      icon={
                        <ThemeIcon color="teal" size={24} radius="xl">
                          <IconCheck size={16} />
                        </ThemeIcon>
                      }
                    >
                      {plan.features.map((feature, featureIndex) => (
                        <List.Item
                          key={featureIndex}
                          icon={
                            feature.included ? (
                              <ThemeIcon color="teal" size={24} radius="xl">
                                <IconCheck size={16} />
                              </ThemeIcon>
                            ) : (
                              <ThemeIcon color="gray" size={24} radius="xl">
                                <IconX size={16} />
                              </ThemeIcon>
                            )
                          }
                          sx={{ opacity: feature.included ? 1 : 0.5 }}
                        >
                          {t(feature.text)}
                        </List.Item>
                      ))}
                    </List>

                    <Button
                      component={Link}
                      to="/register"
                      variant={plan.popular ? "gradient" : "outline"}
                      gradient={plan.popular ? { from: 'blue', to: 'cyan' } : undefined}
                      color={plan.popular ? undefined : "blue"}
                      className={classes.pricingButton}
                    >
                      {t(plan.cta)}
                    </Button>
                  </Card>
                ))}
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="annual">
              <SimpleGrid
                cols={3}
                spacing="xl"
                breakpoints={[
                  { maxWidth: 'md', cols: 2 },
                  { maxWidth: 'sm', cols: 1 },
                ]}
              >
                {pricingPlans.map((plan, index) => {
                  const annualPrice = Math.round(plan.price * 0.8);
                  return (
                    <Card 
                      key={index} 
                      padding="lg" 
                      radius="md" 
                      className={cx(classes.pricingCard, { [classes.pricingPopular]: plan.popular })}
                    >
                      {plan.popular && (
                        <Badge 
                          variant="filled" 
                          sx={{ position: 'absolute', top: 10, right: 10 }}
                        >
                          {t('Most Popular')}
                        </Badge>
                      )}
                      <Card.Section 
                        className={cx(classes.pricingHeader, { [classes.pricingHeaderPopular]: plan.popular })}
                      >
                        <Text className={classes.pricingTitle}>{t(plan.title)}</Text>
                        <div className={classes.pricingPrice}>
                          ${annualPrice}
                          <Text className={classes.pricingMonth}>{t('/month')}</Text>
                        </div>
                        <Text size="sm" color={plan.popular ? "white" : "dimmed"} mt={5}>
                          {t('Billed annually (${0}/year)', [annualPrice * 12])}
                        </Text>
                      </Card.Section>

                      <List
                        spacing="sm"
                        size="sm"
                        mt="md"
                        center
                        icon={
                          <ThemeIcon color="teal" size={24} radius="xl">
                            <IconCheck size={16} />
                          </ThemeIcon>
                        }
                      >
                        {plan.features.map((feature, featureIndex) => (
                          <List.Item
                            key={featureIndex}
                            icon={
                              feature.included ? (
                                <ThemeIcon color="teal" size={24} radius="xl">
                                  <IconCheck size={16} />
                                </ThemeIcon>
                              ) : (
                                <ThemeIcon color="gray" size={24} radius="xl">
                                  <IconX size={16} />
                                </ThemeIcon>
                              )
                            }
                            sx={{ opacity: feature.included ? 1 : 0.5 }}
                          >
                            {t(feature.text)}
                          </List.Item>
                        ))}
                      </List>

                      <Button
                        component={Link}
                        to="/register"
                        variant={plan.popular ? "gradient" : "outline"}
                        gradient={plan.popular ? { from: 'blue', to: 'cyan' } : undefined}
                        color={plan.popular ? undefined : "blue"}
                        className={classes.pricingButton}
                      >
                        {t(plan.cta)}
                      </Button>
                    </Card>
                  );
                })}
              </SimpleGrid>
            </Tabs.Panel>
          </Tabs>

          <Box mt="xl" ta="center">
            <Text>
              {t('Need a custom solution?')} <Anchor component={Link} to="/contact">{t('Contact our sales team')}</Anchor>
            </Text>
          </Box>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box className={classes.section}>
        <Container size="md">
          <Title className={classes.sectionTitle}>
            {t('Frequently Asked Questions')}
          </Title>
          <Text className={classes.sectionDescription}>
            {t('Find answers to common questions about ClinicWave.')}
          </Text>

          <Accordion variant="separated" radius="md">
            {faqItems.map((item, index) => (
              <Accordion.Item key={index} value={`item-${index}`}>
                <Accordion.Control>
                  <Text fw={500}>{t(item.question)}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text>{t(item.answer)}</Text>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box 
        sx={(theme) => ({
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.blue[6],
          padding: `${theme.spacing.xl * 2}px 0`,
          position: 'relative',
        })}
      >
        <Container size="xl">
          <Grid align="center">
            <Grid.Col md={8}>
              <Title 
                order={2} 
                sx={(theme) => ({ 
                  color: theme.white,
                  fontFamily: `Greycliff CF, ${theme.fontFamily}`,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  fontSize: rem(32),
                  [theme.fn.smallerThan('sm')]: {
                    fontSize: rem(24),
                  },
                })}
              >
                {t('Ready to transform your clinic operations?')}
              </Title>
              <Text 
                sx={(theme) => ({ 
                  color: theme.colors.blue[0],
                  maxWidth: 500,
                  marginTop: theme.spacing.md,
                })}
              >
                {t('Join thousands of healthcare providers who trust ClinicWave to streamline their practice management.')}
              </Text>
            </Grid.Col>
            <Grid.Col md={4}>
              <Group position={isMobile ? 'center' : 'right'} mt={isMobile ? 'md' : 0}>
                <Button 
                  size="xl" 
                  variant="white" 
                  color="blue"
                  component={Link}
                  to="/register"
                >
                  {t('Start Your Free Trial')}
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box className={classes.footer}>
        <Container size="xl">
          <Grid>
            <Grid.Col md={4}>
              <Image src="/assets/images/logo.svg" width={160} alt="ClinicWave" className={classes.logo} />
              <Text size="sm" color="dimmed" mt="md">
                {t('ClinicWave is a complete clinic management solution designed for modern healthcare providers.')}
              </Text>
            </Grid.Col>
            <Grid.Col md={2}>
              <Text className={classes.footerTitle}>{t('Product')}</Text>
              <Stack spacing={8} mt="xs">
                <Anchor component={Link} to="/features" color="dimmed" size="sm">
                  {t('Features')}
                </Anchor>
                <Anchor component={Link} to="/pricing" color="dimmed" size="sm">
                  {t('Pricing')}
                </Anchor>
                <Anchor component={Link} to="/demo" color="dimmed" size="sm">
                  {t('Request Demo')}
                </Anchor>
                <Anchor component={Link} to="/security" color="dimmed" size="sm">
                  {t('Security')}
                </Anchor>
              </Stack>
            </Grid.Col>
            <Grid.Col md={2}>
              <Text className={classes.footerTitle}>{t('Company')}</Text>
              <Stack spacing={8} mt="xs">
                <Anchor component={Link} to="/about" color="dimmed" size="sm">
                  {t('About Us')}
                </Anchor>
                <Anchor component={Link} to="/blog" color="dimmed" size="sm">
                  {t('Blog')}
                </Anchor>
                <Anchor component={Link} to="/careers" color="dimmed" size="sm">
                  {t('Careers')}
                </Anchor>
                <Anchor component={Link} to="/contact" color="dimmed" size="sm">
                  {t('Contact')}
                </Anchor>
              </Stack>
            </Grid.Col>
            <Grid.Col md={2}>
              <Text className={classes.footerTitle}>{t('Resources')}</Text>
              <Stack spacing={8} mt="xs">
                <Anchor component={Link} to="/help" color="dimmed" size="sm">
                  {t('Help Center')}
                </Anchor>
                <Anchor component={Link} to="/documentation" color="dimmed" size="sm">
                  {t('Documentation')}
                </Anchor>
                <Anchor component={Link} to="/api" color="dimmed" size="sm">
                  {t('API')}
                </Anchor>
                <Anchor component={Link} to="/status" color="dimmed" size="sm">
                  {t('System Status')}
                </Anchor>
              </Stack>
            </Grid.Col>
            <Grid.Col md={2}>
              <Text className={classes.footerTitle}>{t('Legal')}</Text>
              <Stack spacing={8} mt="xs">
                <Anchor component={Link} to="/terms" color="dimmed" size="sm">
                  {t('Terms of Service')}
                </Anchor>
                <Anchor component={Link} to="/privacy" color="dimmed" size="sm">
                  {t('Privacy Policy')}
                </Anchor>
                <Anchor component={Link} to="/compliance" color="dimmed" size="sm">
                  {t('Compliance')}
                </Anchor>
                <Anchor component={Link} to="/hipaa" color="dimmed" size="sm">
                  {t('HIPAA')}
                </Anchor>
              </Stack>
            </Grid.Col>
          </Grid>

          <div className={classes.afterFooter}>
            <Text color="dimmed" size="sm">
              © {new Date().getFullYear()} ClinicWave. {t('All rights reserved.')}
            </Text>

            <Group spacing={0} className={classes.social} position="right" noWrap>
              <ActionIcon size="lg" color="gray" variant="subtle">
                <IconBrandFacebook size={18} />
              </ActionIcon>
              <ActionIcon size="lg" color="gray" variant="subtle">
                <IconBrandTwitter size={18} />
              </ActionIcon>
              <ActionIcon size="lg" color="gray" variant="subtle">
                <IconBrandInstagram size={18} />
              </ActionIcon>
              <ActionIcon size="lg" color="gray" variant="subtle">
                <IconBrandWhatsapp size={18} />
              </ActionIcon>
            </Group>
          </div>
        </Container>
      </Box>

      {/* Scroll to top button */}
      <Affix position={{ bottom: 20, right: 20 }}>
        <Transition transition="slide-up" mounted={scroll.y > 200}>
          {(transitionStyles) => (
            <ActionIcon
              color="blue"
              size="lg"
              variant="filled"
              style={transitionStyles}
              onClick={() => scrollTo({ y: 0 })}
            >
              <IconArrowUp size={16} />
            </ActionIcon>
          )}
        </Transition>
      </Affix>
    </Box>
  );
};

export default LandingPage;

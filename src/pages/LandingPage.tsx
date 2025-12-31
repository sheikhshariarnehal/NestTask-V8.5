import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Shield, 
  Smartphone, 
  Zap, 
  BookOpen,
  Calendar,
  Bell,
  BarChart3,
  Github,
  Mail,
  ExternalLink,
  Play,
  Star,
  Globe,
  Database,
  Palette,
  Code,
  Menu,
  X,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useSmoothScroll } from '../hooks/useSmoothScroll';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollToSection } = useSmoothScroll();
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Students, Section Admins, and Super Admins with granular permissions for seamless academic collaboration.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: BookOpen,
      title: "Academic Excellence",
      description: "Purpose-built for universities with department, batch, and section organization that mirrors real academic structures.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Smartphone,
      title: "Progressive Web App",
      description: "Native app experience on any device with offline support, push notifications, and instant loading.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with Supabase authentication, row-level security, and encrypted data protection.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Calendar,
      title: "Smart Task Management",
      description: "AI-powered task categorization, intelligent due date tracking, and automated progress monitoring.",
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Real-time insights into productivity, performance metrics, and predictive analytics for academic success.",
      gradient: "from-teal-500 to-blue-500"
    }
  ];

  const techStack = [
    { name: "React 18", icon: Code, color: "text-blue-400", glow: "shadow-blue-500/20" },
    { name: "TypeScript", icon: Code, color: "text-blue-300", glow: "shadow-blue-400/20" },
    { name: "Supabase", icon: Database, color: "text-green-400", glow: "shadow-green-500/20" },
    { name: "Tailwind CSS", icon: Palette, color: "text-cyan-400", glow: "shadow-cyan-500/20" },
    { name: "PWA Ready", icon: Globe, color: "text-purple-400", glow: "shadow-purple-500/20" },
    { name: "Firebase", icon: Zap, color: "text-orange-400", glow: "shadow-orange-500/20" }
  ];

  const userRoles = [
    {
      title: "Students",
      description: "Intuitive dashboard for academic success with smart task organization and progress tracking",
      features: ["Smart task viewing", "Progress analytics", "Routine management", "Mobile-first design"],
      icon: BookOpen,
      gradient: "from-blue-600 to-purple-600"
    },
    {
      title: "Section Admins", 
      description: "Comprehensive tools for managing academic sections with advanced user and task administration",
      features: ["User management", "Task orchestration", "Performance analytics", "Automated workflows"],
      icon: Users,
      gradient: "from-purple-600 to-pink-600"
    },
    {
      title: "Super Admins",
      description: "Enterprise-level control with system-wide administration and cross-department insights",
      features: ["System oversight", "Department management", "Global analytics", "Advanced permissions"],
      icon: Shield,
      gradient: "from-pink-600 to-red-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <motion.div 
          style={{ y: backgroundY }}
          className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-xl z-50 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-white font-bold text-lg">N</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-50 -z-10" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                NestTask
              </span>
            </motion.div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-300 hover:text-blue-400 font-medium transition-all duration-300 hover:scale-105"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('technology')}
                className="text-gray-300 hover:text-blue-400 font-medium transition-all duration-300 hover:scale-105"
              >
                Technology
              </button>
              <button
                onClick={() => scrollToSection('roles')}
                className="text-gray-300 hover:text-blue-400 font-medium transition-all duration-300 hover:scale-105"
              >
                User Roles
              </button>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:flex items-center space-x-4"
            >
              <button
                onClick={onLogin}
                className="text-gray-300 hover:text-white font-medium transition-all duration-300 px-4 py-2 rounded-lg hover:bg-gray-800/50"
              >
                Sign In
              </button>
              <button
                onClick={onGetStarted}
                className="relative bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-blue-500/25"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-50 -z-10" />
              </button>
            </motion.div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-gray-800/50 transition-all duration-300"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden absolute top-16 left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl"
            >
              <div className="px-4 py-6 space-y-4">
                <button
                  onClick={() => {
                    scrollToSection('features');
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-300 hover:text-blue-400 font-medium transition-colors py-2"
                >
                  Features
                </button>
                <button
                  onClick={() => {
                    scrollToSection('technology');
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-300 hover:text-blue-400 font-medium transition-colors py-2"
                >
                  Technology
                </button>
                <button
                  onClick={() => {
                    scrollToSection('roles');
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-300 hover:text-blue-400 font-medium transition-colors py-2"
                >
                  User Roles
                </button>
                <div className="border-t border-gray-800 pt-4 space-y-3">
                  <button
                    onClick={onLogin}
                    className="block w-full text-left text-gray-300 hover:text-white font-medium transition-colors py-2"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={onGetStarted}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute w-32 h-32 border border-blue-500/20 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute w-24 h-24 border border-purple-500/20 rounded-full"
                />
                <Sparkles className="w-16 h-16 text-blue-400 z-10" />
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                  Academic Excellence
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Redefined
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                Experience the future of university task management with our
                <span className="text-blue-400 font-semibold"> AI-powered platform</span> designed
                for the modern academic environment.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <motion.button
                  onClick={onGetStarted}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center space-x-3 shadow-2xl shadow-blue-500/25"
                >
                  <span>Start Your Journey</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50 -z-10 group-hover:opacity-75 transition-opacity" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group border-2 border-gray-600 hover:border-blue-500 text-gray-300 hover:text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center space-x-3 backdrop-blur-sm hover:bg-gray-800/30"
                >
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Watch Demo</span>
                </motion.button>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mt-16"
              >
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-gray-400 hover:text-blue-400 transition-colors animate-bounce"
                >
                  <ChevronDown className="w-8 h-8 mx-auto" />
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Powerful Features for
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Academic Success
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Cutting-edge tools designed to revolutionize how universities manage academic workflows
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:border-gray-700 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-gray-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-blue-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section id="technology" className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Built with
                </span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {" "}Cutting-Edge Technology
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Leveraging the most advanced tools and frameworks for unparalleled performance and reliability
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {techStack.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.05 }}
                className={`group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 text-center hover:border-gray-700 transition-all duration-300 ${tech.glow} hover:shadow-2xl`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-gray-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <tech.icon className={`w-12 h-12 mx-auto mb-4 ${tech.color} group-hover:scale-110 transition-transform duration-300`} />
                <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{tech.name}</p>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section id="roles" className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Designed for
                </span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {" "}Every User
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Tailored experiences that empower every member of your academic community
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {userRoles.map((role, index) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                className="group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-3xl p-8 hover:border-gray-700 transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />

                <div className={`w-16 h-16 bg-gradient-to-r ${role.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <role.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">
                  {role.title}
                </h3>
                <p className="text-gray-400 mb-8 leading-relaxed group-hover:text-gray-300 transition-colors">
                  {role.description}
                </p>

                <ul className="space-y-4">
                  {role.features.map((feature, featureIndex) => (
                    <motion.li
                      key={feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: (index * 0.2) + (featureIndex * 0.1) }}
                      viewport={{ once: true }}
                      className="flex items-center space-x-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 group-hover:text-white transition-colors">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-6 h-6 text-blue-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  See NestTask
                </span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {" "}in Action
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Experience the intuitive interface and powerful features that make academic task management effortless
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl" />
                <div className="relative z-10">
                  <h3 className="text-3xl font-bold mb-4 flex items-center space-x-3">
                    <BookOpen className="w-8 h-8" />
                    <span>Student Dashboard</span>
                  </h3>
                  <p className="text-blue-100 mb-8 text-lg">
                    Intuitive, dark-themed interface designed for focus and productivity in academic environments.
                  </p>
                  <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-white/20 rounded-lg w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-white/15 rounded-lg w-1/2 animate-pulse delay-100"></div>
                      <div className="h-4 bg-white/10 rounded-lg w-2/3 animate-pulse delay-200"></div>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="h-8 bg-blue-500/30 rounded-lg animate-pulse delay-300"></div>
                        <div className="h-8 bg-purple-500/30 rounded-lg animate-pulse delay-400"></div>
                        <div className="h-8 bg-green-500/30 rounded-lg animate-pulse delay-500"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-800 rounded-3xl p-8 text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl" />
                <div className="relative z-10">
                  <h3 className="text-3xl font-bold mb-4 flex items-center space-x-3">
                    <Shield className="w-8 h-8" />
                    <span>Admin Panel</span>
                  </h3>
                  <p className="text-purple-100 mb-8 text-lg">
                    Comprehensive administrative tools with advanced analytics and user management capabilities.
                  </p>
                  <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-12 bg-white/20 rounded-lg animate-pulse"></div>
                      <div className="h-12 bg-white/15 rounded-lg animate-pulse delay-100"></div>
                      <div className="h-6 bg-white/10 rounded-lg col-span-2 animate-pulse delay-200"></div>
                      <div className="h-6 bg-white/15 rounded-lg col-span-2 animate-pulse delay-300"></div>
                      <div className="h-8 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-lg col-span-2 animate-pulse delay-400"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-12 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl" />
            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Ready to Transform Your
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Academic Workflow?
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join thousands of students and educators who are already using NestTask to
                revolutionize their academic task management experience.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <motion.button
                  onClick={onGetStarted}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-2xl shadow-blue-500/25"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50 -z-10 group-hover:opacity-75 transition-opacity" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group border-2 border-gray-600 hover:border-blue-500 text-gray-300 hover:text-white px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 backdrop-blur-sm hover:bg-gray-800/30"
                >
                  <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>View on GitHub</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-gray-950 border-t border-gray-800 py-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <span className="text-white font-bold text-xl">N</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-50 -z-10" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  NestTask
                </span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                A revolutionary academic task management system designed for the modern university environment.
                Empowering students and educators with cutting-edge technology.
              </p>
              <div className="flex space-x-4">
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
                >
                  <Github className="w-5 h-5" />
                </motion.a>
                <motion.a
                  href="mailto:nehalindex002@gmail.com"
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
                >
                  <Mail className="w-5 h-5" />
                </motion.a>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-white mb-6 text-lg">Product</h3>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#features" className="hover:text-blue-400 transition-colors cursor-pointer">Features</a></li>
                <li><a href="#technology" className="hover:text-blue-400 transition-colors cursor-pointer">Technology</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-6 text-lg">Support</h3>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Help Center</a></li>
                <li><a href="mailto:nehalindex002@gmail.com" className="hover:text-blue-400 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Community</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 NestTask. Built with ❤️ for Daffodil International University.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a href="#" className="text-gray-400 hover:text-blue-400 text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-blue-400 text-sm transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

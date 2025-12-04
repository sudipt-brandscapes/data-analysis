import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';
import {
  Brain,
  Activity,
  Shield,
  Rocket,
  ArrowRight,
  LineChart,
  PieChart,
  Target,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { Header, Footer } from '../layout';
import { Button, Card } from '../common';

// Custom Cursor Component with Sparkles
const CustomCursor = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const [sparkles, setSparkles] = useState([]);
  
  const springConfig = { damping: 25, stiffness: 700 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      cursorX.set(x - 20);
      cursorY.set(y - 20);

      // Create sparkle effect
      if (Math.random() > 0.7) {
        const newSparkle = {
          id: Date.now() + Math.random(),
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          size: Math.random() * 8 + 4,
          color: ['#3b82f6', '#9333ea', '#ec4899', '#f59e0b'][Math.floor(Math.random() * 4)],
        };
        setSparkles((prev) => [...prev.slice(-15), newSparkle]);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [cursorX, cursorY]);

  // Clean up old sparkles
  useEffect(() => {
    const interval = setInterval(() => {
      setSparkles((prev) => prev.slice(-10));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Sparkles */}
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="fixed pointer-events-none z-50"
          initial={{ 
            x: sparkle.x, 
            y: sparkle.y, 
            scale: 1, 
            opacity: 1,
            rotate: 0 
          }}
          animate={{ 
            y: sparkle.y - 50,
            scale: 0,
            opacity: 0,
            rotate: 180
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            width: sparkle.size,
            height: sparkle.size,
            background: sparkle.color,
            boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.color}`,
          }}
        >
          <div className="w-full h-full" style={{
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            background: sparkle.color,
          }} />
        </motion.div>
      ))}

      {/* Cursor glow effect */}
      <motion.div
        className="fixed pointer-events-none z-50"
        style={{
          left: cursorXSpring,
          top: cursorYSpring,
          width: 40,
          height: 40,
        }}
      >
        <motion.div
          className="w-full h-full rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(147, 51, 234, 0.3) 50%, transparent 70%)',
            filter: 'blur(10px)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Arrow cursor */}
      <motion.div
        className="fixed pointer-events-none z-50"
        style={{
          left: cursorX,
          top: cursorY,
          x: 20,
          y: 20,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Arrow shape */}
          <path
            d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
            fill="white"
            stroke="url(#gradient)"
            strokeWidth="1"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))',
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="3" y1="3" x2="19.97" y2="19.97">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </>
  );
};

// 3D Animated Sphere Component
const AnimatedSphere = ({ position, color, speed = 1 }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * speed * 0.3;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * speed * 0.2;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * speed) * 0.5;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 100, 100]} position={position}>
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0.2}
        metalness={0.8}
      />
    </Sphere>
  );
};

// Geometric Shapes Components
const AnimatedTorus = ({ position, color, speed = 1 }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * speed * 0.5;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * speed * 0.3;
      meshRef.current.position.x = position[0] + Math.cos(state.clock.getElapsedTime() * speed * 0.5) * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[0.8, 0.3, 16, 100]} />
      <meshStandardMaterial color={color} wireframe metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

const AnimatedOctahedron = ({ position, color, speed = 1 }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * speed * 0.4;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * speed * 0.6;
      meshRef.current.position.z = position[2] + Math.sin(state.clock.getElapsedTime() * speed) * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} wireframe metalness={0.9} roughness={0.1} />
    </mesh>
  );
};

const AnimatedIcosahedron = ({ position, color, speed = 1 }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * speed * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * speed * 0.4;
      meshRef.current.rotation.z = state.clock.getElapsedTime() * speed * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial color={color} wireframe metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

// 3D Background Scene with Geometric Shapes
const ThreeBackground = () => {
  return (
    <div className="absolute inset-0 opacity-40">
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
        <pointLight position={[10, 10, 5]} intensity={0.5} color="#9333ea" />
        <pointLight position={[0, 10, 0]} intensity={0.3} color="#ec4899" />
        
        {/* Spheres */}
        <AnimatedSphere position={[-3, 0, 0]} color="#3b82f6" speed={0.8} />
        <AnimatedSphere position={[3, 0, -2]} color="#9333ea" speed={1.2} />
        
        {/* Geometric Shapes */}
        <AnimatedTorus position={[2, 2, -1]} color="#ec4899" speed={0.6} />
        <AnimatedOctahedron position={[-2, -2, 0]} color="#3b82f6" speed={0.9} />
        <AnimatedIcosahedron position={[0, 2, -2]} color="#f59e0b" speed={0.7} />
        <AnimatedTorus position={[-3, 1, -3]} color="#10b981" speed={0.5} />
        <AnimatedOctahedron position={[3, -1, 1]} color="#8b5cf6" speed={1.1} />
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};

// Floating Mathematical Formulas
const FloatingFormulas = () => {
  const formulas = [
    'f(x) = ∫ e^x dx',
    'E = mc²',
    '∑ᵢ₌₁ⁿ xᵢ',
    'π = 3.14159...',
    '∇·F = ρ',
    'y = mx + b',
    'a² + b² = c²',
    'lim(x→∞)',
    'Δx/Δt',
    '∂f/∂x',
    'λ = h/p',
    'sin²θ + cos²θ = 1',
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {formulas.map((formula, index) => (
        <motion.div
          key={index}
          className="absolute text-blue-400/20 font-mono text-sm md:text-base"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            opacity: 0,
          }}
          animate={{
            x: [
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
            ],
            y: [
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight,
            ],
            opacity: [0, 0.3, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            delay: index * 0.5,
            ease: 'linear',
          }}
        >
          {formula}
        </motion.div>
      ))}
    </div>
  );
};

const DataVisualization = () => {
  const dataPoints = [
    { value: 75, label: 'Data Processing', color: 'bg-blue-500' },
    { value: 90, label: 'AI Accuracy', color: 'bg-purple-500' },
    { value: 85, label: 'User Satisfaction', color: 'bg-pink-500' },
    { value: 95, label: 'System Uptime', color: 'bg-indigo-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {dataPoints.map((point, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: index * 0.2 }}
          className="bg-black/80 p-4 rounded-lg backdrop-blur-sm border border-gray-900"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">{point.label}</span>
            <span className="text-white font-bold">{point.value}%</span>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${point.value}%` }}
              transition={{ duration: 1.5, delay: index * 0.3 }}
              className={`${point.color} h-2 rounded-full`}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const HeroSection = ({ onGetStarted }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-black">
        <ThreeBackground />
        <FloatingFormulas />
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
          }}
          animate={{
            x: mousePosition.x * 100,
            y: mousePosition.y * 100,
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)',
          }}
          animate={{
            x: -mousePosition.x * 100,
            y: -mousePosition.y * 100,
            scale: [1.2, 1, 1.2],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            style={{
              transform: `perspective(1000px) rotateY(${mousePosition.x * 5}deg) rotateX(${-mousePosition.y * 5}deg)`,
            }}
            className="text-center lg:text-left"
          >
           

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-5xl lg:text-7xl font-bold text-white mb-6"
            >
              Transform Data Into{' '}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Actionable Insights
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl text-gray-300 mb-8 leading-relaxed"
            >
              Experience the future of data analysis with our cutting-edge platform. AI-powered
              queries, stunning visualizations, and real-time insights at your fingertips.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button variant="primary" size="lg" icon={ArrowRight} onClick={onGetStarted}>
                Get Started
              </Button>
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="grid grid-cols-3 gap-6 mt-12"
            >
              {[
                { number: '10K+', label: 'Active Users' },
                { number: '95%', label: 'Accuracy Rate' },
                { number: '50+', label: 'Data Sources' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.number}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{
              transform: `perspective(1000px) rotateY(${-mousePosition.x * 10}deg) rotateX(${mousePosition.y * 10}deg) translateZ(50px)`,
              transformStyle: 'preserve-3d',
            }}
            className="relative"
          >
            <motion.div 
              className="relative bg-black/60 backdrop-blur-lg rounded-2xl p-8 border border-gray-900"
              whileHover={{ 
                scale: 1.05,
                rotateY: 5,
                rotateX: -5,
                transition: { duration: 0.3 }
              }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Live Analytics</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm">Active</span>
                </div>
              </div>
              <DataVisualization />
            </motion.div>

            <motion.div
              animate={{ 
                y: [0, -15, 0],
                rotateZ: [0, 5, -5, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-xl shadow-2xl"
              style={{ transformStyle: 'preserve-3d', transform: 'translateZ(30px)' }}
            >
              <Brain className="w-8 h-8" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeatureSection = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description:
        'Advanced machine learning algorithms that understand your data and provide intelligent insights automatically.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Activity,
      title: 'Real-time Processing',
      description:
        'Process millions of data points in seconds with our optimized analytics engine and get instant results.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description:
        'Bank-level encryption and security protocols to keep your sensitive data safe and compliant.',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: Rocket,
      title: 'Lightning Fast',
      description:
        'Optimized for speed and performance, delivering complex analytics results in milliseconds.',
      color: 'from-pink-500 to-pink-600',
    },
  ];

  return (
    <section id="features" className="py-20 bg-black relative overflow-hidden">
      {/* Geometric Background Patterns */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-blue-500/30"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Powerful Features for{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Modern Analytics
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Everything you need to transform your data into actionable insights with cutting-edge
            technology.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
              whileHover={{ 
                scale: 1.05, 
                y: -10,
                rotateY: 5,
                rotateX: -5,
                z: 50,
              }}
              style={{
                transformStyle: 'preserve-3d',
                perspective: 1000,
              }}
            >
              <Card hover gradient className="p-8 h-full relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6 relative z-10`}
                  animate={{
                    rotateY: hoveredIndex === index ? 360 : 0,
                    scale: hoveredIndex === index ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.6 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-4 relative z-10">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed relative z-10">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const AnalyticsSection = () => {
  return (
    <section id="analytics" className="py-20 bg-black relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
      </div>
      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${(i * 15) % 100}%`,
              top: `${(i * 20) % 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 180, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            <div className="w-16 h-16 border-2 border-purple-500/50" style={{
              clipPath: i % 3 === 0 
                ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' 
                : i % 3 === 1
                ? 'polygon(50% 0%, 100% 100%, 0% 100%)'
                : 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
            }} />
          </motion.div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Advanced Analytics{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Our intuitive interface makes complex data analysis accessible to everyone. No coding
              required - just ask questions in natural language and get instant insights.
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: LineChart,
                  title: 'Interactive Visualizations',
                  desc: 'Beautiful, interactive charts and graphs that bring your data to life.',
                },
                {
                  icon: PieChart,
                  title: 'Multi-dimensional Analysis',
                  desc: 'Analyze data from multiple angles with our comprehensive toolkit.',
                },
                {
                  icon: Target,
                  title: 'Predictive Analytics',
                  desc: 'Forecast trends and make data-driven decisions with confidence.',
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            whileHover={{
              scale: 1.05,
              rotateY: -5,
              rotateX: 5,
              z: 50,
            }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: 1000,
            }}
            className="relative"
          >
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Data Insights</h3>
                <div className="flex space-x-2">
                  <motion.div 
                    className="w-3 h-3 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div 
                    className="w-3 h-3 bg-yellow-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  />
                  <motion.div 
                    className="w-3 h-3 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {[65, 80, 45, 90, 75].map((value, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center space-x-3"
                    whileHover={{ x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div 
                      className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                      animate={{ 
                        scale: [1, 1.3, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        delay: index * 0.2
                      }}
                    />
                    <div className="flex-1 bg-gray-900 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${value}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      />
                    </div>
                    <span className="text-gray-300 text-sm">{value}%</span>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-black cursor-none">
      <CustomCursor />
      <Header onGetStarted={onGetStarted} />
      <HeroSection onGetStarted={onGetStarted} />
      <FeatureSection />
      <AnalyticsSection />
      <Footer />
    </div>
  );
};

LandingPage.propTypes = {
  onGetStarted: PropTypes.func.isRequired,
};

HeroSection.propTypes = {
  onGetStarted: PropTypes.func.isRequired,
};

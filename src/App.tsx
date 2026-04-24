/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Settings, 
  Users, 
  Award, 
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowRight,
  Menu,
  X,
  ChevronRight,
  Factory,
  Zap,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = {
  primary: '#004A99', // Professional Blue from Logo
  secondary: '#1A1A1A',
  accent: '#E5E5E5',
  white: '#FFFFFF',
};

// --- Components ---

const HeroSlider = () => {
  const slides = [
    {
      image: '/input_file_2.png',
      title: 'Precision Weaving',
      subtitle: 'Ultra-modern production facilities for individual textile solutions.'
    },
    {
      image: '/input_file_1.png',
      title: 'Premium Tapes & Braids',
      subtitle: 'Woven, elastic, and non-elastic solutions for global industries.'
    },
    {
      image: '/input_file_5.png',
      title: 'High-Tech Narrow Textiles',
      subtitle: 'Engineering excellence for extreme requirements.'
    },
    {
      image: '/input_file_6.png',
      title: 'Quality Material Selection',
      subtitle: 'Cotton, Polyester, Aramid and other special yarns.'
    }
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section id="home" className="relative h-screen flex items-center overflow-hidden bg-slate-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 z-0"
        >
          <img 
            src={slides[current].image} 
            alt="Textile Manufacturing" 
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <motion.div
          key={current + '-text'}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Zap className="w-3 h-3" /> Technical Excellence Since 2024
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            {slides[current].title.split(' ')[0]} <br />
            <span className="text-[#004A99]">{slides[current].title.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-8 leading-relaxed">
            {slides[current].subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a 
              href="#products" 
              className="px-8 py-4 bg-[#004A99] hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              Explore Products <ArrowRight className="w-5 h-5" />
            </a>
            <a 
              href="#contact" 
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-bold transition-all text-center backdrop-blur-sm"
            >
              Contact Sales
            </a>
          </div>
        </motion.div>
      </div>

      {/* Slider Controls */}
      <div className="absolute bottom-12 left-6 md:left-12 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 transition-all rounded-full ${current === i ? 'w-12 bg-[#004A99]' : 'w-4 bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>
      
      {/* Floating Stats */}
      <div className="absolute bottom-12 right-6 md:right-12 z-10 hidden lg:flex gap-12">
        {[
          { label: 'Employees', value: '30+' },
          { label: 'Capabilities', value: 'ISO 9001' },
          { label: 'Location', value: 'Karachi' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex flex-col border-l border-white/20 pl-6"
          >
            <span className="text-3xl font-bold text-white mb-1">{stat.value}</span>
            <span className="text-xs text-slate-400 uppercase tracking-widest">{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Products', href: '#products' },
    { name: 'Capabilities', href: '#capabilities' },
    { name: 'Quality', href: '#quality' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img 
            src="/input_file_8.png" 
            alt="Interconverters Logo Icon" 
            className="w-10 h-10 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className={`font-bold leading-none tracking-tight text-xl ${isScrolled ? 'text-[#004A99]' : 'text-white'}`}>INTERCONVERTERS</span>
            <span className={`text-[10px] font-medium tracking-[0.2em] ${isScrolled ? 'text-slate-500' : 'text-slate-300'}`}>PVT. LTD.</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className={`text-sm font-bold uppercase tracking-widest hover:text-[#004A99] transition-colors ${isScrolled ? 'text-slate-600' : 'text-white'}`}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className={isScrolled ? 'text-slate-900' : 'text-white'} />
          ) : (
            <Menu className={isScrolled ? 'text-slate-900' : 'text-white'} />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-white shadow-xl py-6 flex flex-col items-center gap-4 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-800 text-lg font-medium"
              >
                {link.name}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const ProductCard = ({ title, description, features, image }: { title: string, description: string, features: string[], image: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all group"
  >
    <div className="aspect-square bg-slate-100 overflow-hidden relative">
      <img 
        src={image} 
        alt={title} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
        <button className="text-white text-sm font-semibold flex items-center gap-2">
          View Specifications <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
    <div className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-4 leading-relaxed">{description}</p>
      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-[#004A99]" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  </motion.div>
);

const CapabilityRow = ({ label, woven, knitted, braided }: { label: string, woven: string, knitted: string, braided: string }) => (
  <div className="grid grid-cols-4 border-b border-slate-100 py-4 px-2 hover:bg-slate-50 transition-colors">
    <div className="text-sm font-bold text-slate-900">{label}</div>
    <div className="text-sm text-slate-600">{woven}</div>
    <div className="text-sm text-slate-600">{knitted}</div>
    <div className="text-sm text-slate-600">{braided}</div>
  </div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <HeroSlider />

      {/* Who We Are */}
      <section id="about" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative rounded-2xl overflow-hidden shadow-2xl"
            >
              <img 
                src="/input_file_5.png" 
                alt="Our Facility" 
                className="w-full h-[500px] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-blue-900/20" />
              <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 backdrop-blur-sm rounded-xl">
                 <p className="text-xs font-bold text-[#004A99] uppercase tracking-widest mb-1">Karachi Headquarters</p>
                 <p className="text-slate-800 text-sm font-medium">Equipped with ultra-modern production facilities.</p>
              </div>
            </motion.div>
            
            <div className="space-y-8">
              <div>
                <h2 className="text-blue-600 font-bold tracking-widest text-sm uppercase mb-4">Who We Are</h2>
                <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 text-balance">Expert Solutions for Extreme Requirements</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  At our modern headquarters in Karachi, Pakistan, more than 30 experts develop and produce elastic and non-elastic woven and knitted tapes, as well as medical bandages.
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-8">
                {[
                  { icon: Factory, title: "Modern Tech", desc: "Ultra-modern machine park for innovative processes." },
                  { icon: Shield, title: "Reliability", desc: "Highest degree of assurance under unusual circumstances." },
                  { icon: Globe, title: "Global Reach", desc: "Serving automotive, aviation, and industrial branches worldwide." },
                  { icon: Users, title: "Partner-First", desc: "Competent solution partner for outdoor manufacturers." },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-[#004A99]">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="bg-[#004A99] py-20 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 border-4 border-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 border-4 border-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-white/60 text-6xl font-serif leading-none">“</span>
            <blockquote className="text-2xl md:text-4xl font-medium text-white mb-8 italic">
              Interconverters Pvt. Ltd. is more than a manufacturer of high-quality textiles. We are your innovative partner for high-tech narrow textiles.
            </blockquote>
            <div className="text-white">
              <p className="font-bold text-xl">Haseeb Khan</p>
              <p className="text-white/70 text-sm uppercase tracking-widest mt-1">Managing Director</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-blue-600 font-bold tracking-widest text-sm uppercase mb-4">Precision Manufacturing</h2>
              <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Our Textile Solutions</h3>
              <p className="text-slate-600 text-lg">
                Specially developed, precisely defined, high-quality workmanship for cuffs, fasteners, and medical applications.
              </p>
            </div>
            <button className="text-[#004A99] font-bold flex items-center gap-2 border-b-2 border-transparent hover:border-[#004A99] transition-all pb-1">
              View Catalog <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ProductCard 
              title="Rubber Tape"
              description="Woven, elastic, variable width and colour. Ideal for extreme environmental protection."
              features={["Customer-specific equipment", "Variable width", "Multi-colour options"]}
              image="/input_file_0.png"
            />
            <ProductCard 
              title="Premium Bundles"
              description="High-performance woven and knitted tapes with integrated design elements and extreme durability."
              features={["Bi-elastic fabrics", "Saltwater resistant", "Heat repellent"]}
              image="/input_file_1.png"
            />
            <ProductCard 
              title="Medical Bandages"
              description="Knitted high elastic bandage made of Cotton and Polyester. Breathable and comfortable."
              features={["Skin friendly", "Disinfectable textiles", "Oeko-Tex Standard"]}
              image="https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=2070&auto=format&fit=crop"
            />
            <ProductCard 
              title="Precision Knitting"
              description="Highly specialized knitted fabrics for technical borders and industrial reinforcement."
              features={["Slotted & perforated", "Flame-retardant", "Variable eyelets"]}
              image="/input_file_3.png"
            />
            <ProductCard 
              title="Carrier Strap"
              description="Heavy-duty straps for backpacks, outdoor equipment, and safety harnesses."
              features={["Maximum safety", "High load capacity", "Technical narrow textiles"]}
              image="/input_file_2.png"
            />
            <ProductCard 
              title="Braided Elastic"
              description="Buttonhole braids and cords for high-performance sports textiles and uniforms."
              features={["Elastic & Non-elastic", "Round or Flat", "Customer-specific finish"]}
              image="/input_file_4.png"
            />
          </div>
        </div>
      </section>

      {/* Capabilities Matrix */}
      <section id="capabilities" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-blue-400 font-bold tracking-widest text-sm uppercase mb-4">Technical Matrix</h2>
            <h3 className="text-3xl md:text-5xl font-bold mb-6">What We Offer. What We Can Do.</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-10 shadow-2xl overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-4 bg-[#004A99] py-5 px-4 rounded-xl text-white font-bold mb-4">
                <div>Feature</div>
                <div>Woven Fabrics</div>
                <div>Knitted Fabrics</div>
                <div>Braided</div>
              </div>
              
              <CapabilityRow 
                label="Item" 
                woven="Tapes, Straps" 
                knitted="Nets, Raschel goods" 
                braided="Braids, Cords, Hoses" 
              />
              <CapabilityRow 
                label="Property" 
                woven="Elastic, Transverse" 
                knitted="Elastic, Bi-elastic" 
                braided="Elastic, Non-elastic" 
              />
              <CapabilityRow 
                label="Width/Dia" 
                woven="2mm - 320mm" 
                knitted="Depends on design" 
                braided="0.5mm - 65mm" 
              />
              <CapabilityRow 
                label="Elongation" 
                woven="10% - 200%" 
                knitted="Depends on design" 
                braided="5% - 300%" 
              />
              <CapabilityRow 
                label="Materials" 
                woven="PES, Cotton, Aramid" 
                knitted="Nylon, Polyacrylic" 
                braided="Lycra, Silicone, PES" 
              />
            </div>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Finishing', desc: 'Low-shrinkage, Flame retardant, Water-repellent' },
                { title: 'Packaging', desc: 'Bobbins, Cable drums, Cardboard boxes' },
                { title: 'Cutting', desc: 'Ultrasonic, Laser cuts, Hot & Bevel' },
                { title: 'R&D', desc: 'In cooperation with leading research institutions' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 p-6 rounded-xl">
                  <h4 className="text-[#004A99] font-bold text-sm mb-2">{item.title}</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quality Section */}
      <section id="quality" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-blue-600 font-bold tracking-widest text-sm uppercase mb-4">Integrity & Quality</h2>
              <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-8">Sustainability Responsibility</h3>
              <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                Highest quality takes top priority at Interconverters Pvt. Ltd. We are a future-oriented company taking responsibility for people and nature.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Certified ISO 14001</h4>
                    <p className="text-slate-500 text-sm">Environmental management system ensuring responsible resource use.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#004A99]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">OEKO-TEX® Standard 100</h4>
                    <p className="text-slate-500 text-sm">All products tested for harmful substances and skin safety.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-slate-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Certified ISO 9001</h4>
                    <p className="text-slate-500 text-sm">Strict quality assurance systems integrated into all production processes.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
                <div className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center p-8 border border-slate-200">
                   <div className="text-center font-bold text-slate-400">ISO 14001</div>
                </div>
                <div className="aspect-square bg-white rounded-2xl flex items-center justify-center p-8 border border-slate-200 shadow-lg">
                   <div className="text-center font-bold text-[#004A99]">OEKO-TEX®</div>
                </div>
                <div className="aspect-square bg-white rounded-2xl flex items-center justify-center p-8 border border-slate-200 shadow-lg">
                   <div className="text-center font-bold text-[#004A99]">ISO 9001</div>
                </div>
                <div className="aspect-square bg-slate-950 rounded-2xl flex items-center justify-center p-8">
                   <Award className="text-white w-12 h-12" />
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row border border-slate-100">
            <div className="lg:w-2/5 bg-[#004A99] p-12 text-white relative">
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-6">Let's develop your solution.</h3>
                <p className="text-white/70 mb-12">The solution is as individual as the requirement. Our development team creates what you want.</p>
                
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <Phone className="w-6 h-6 text-blue-300 mt-1" />
                    <div>
                      <p className="font-bold">Phone</p>
                      <p className="text-blue-100">+92 -21-36958286</p>
                      <p className="text-blue-100">36959161</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-blue-300 mt-1" />
                    <div>
                      <p className="font-bold">Email</p>
                      <p className="text-blue-100">sales@interconverters.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-blue-300 mt-1" />
                    <div>
                      <p className="font-bold">Headquarters</p>
                      <p className="text-blue-100 italic leading-relaxed">
                        24, Sector 12-B, North Karachi Industrial Area; Karachi, Sindh 75850; Pakistan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-tl-[100%] pointer-events-none" />
            </div>
            
            <div className="lg:w-3/5 p-12 bg-white">
              <h4 className="text-2xl font-bold mb-8">Send a Message</h4>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">First Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004A99] transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Last Name</label>
                    <input type="text" className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004A99] transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</label>
                  <input type="email" className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004A99] transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Subject / Application Field</label>
                  <input type="text" className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004A99] transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Message</label>
                  <textarea rows={4} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004A99] transition-all"></textarea>
                </div>
                <button className="w-full bg-[#004A99] text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10">
                  Send Inquiry Request
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img 
                  src="/input_file_8.png" 
                  alt="Interconverters Logo Footer" 
                  className="w-12 h-12 object-contain brightness-0 invert"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-white text-2xl leading-none tracking-tight">INTERCONVERTERS</span>
                  <span className="text-[10px] font-medium tracking-[0.3em] text-[#004A99]">PVT. LTD.</span>
                </div>
              </div>
              <p className="text-slate-500 max-w-sm mb-6 leading-relaxed">
                Leading manufacturer of high-quality textiles for protective, automotive, industrial, and medical requirements. Interloping quality fabric since 2024.
              </p>
              <div className="flex gap-4">
                {/* Social placeholders could go here */}
              </div>
            </div>
            
            <div>
              <h5 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Quick Links</h5>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#about" className="hover:text-white transition-colors">Our History</a></li>
                <li><a href="#products" className="hover:text-white transition-colors">Product Catalogue</a></li>
                <li><a href="#capabilities" className="hover:text-white transition-colors">Technical Specs</a></li>
                <li><a href="#quality" className="hover:text-white transition-colors">Certifications</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="text-white font-bold mb-6 uppercase text-sm tracking-widest">Global Support</h5>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Karachi Hub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Delivery</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Inquiry Form</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold tracking-widest uppercase">
            <p>© 2024 Interconverters Pvt. Ltd. All rights reserved.</p>
            <p>Design & Engineering for Extreme Conditions</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

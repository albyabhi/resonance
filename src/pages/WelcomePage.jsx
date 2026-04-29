import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, LayoutDashboard, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

import img1 from '../assets/1.png';
import img2 from '../assets/2.png';
import img3 from '../assets/3.png';
import img4 from '../assets/4.png';
import img5 from '../assets/5.png';
import MandalaBackground from '../components/MandalaBackground';


export default function WelcomePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [img1, img2, img3, img4, img5];


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Resonance Logo" className="h-12 w-auto" />
            <span className="text-xl font-normal tracking-tight">Resonance</span>
          </div>
          
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">About Us</a>
            <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors md:block">Login</Link>
            <Link to="/entry" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Background subtle gradient blobs */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

          <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
              <div className="max-w-2xl">
                <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wider text-blue-700 uppercase mb-6">
                  Competitions. Connected. Celebrated.
                </span>
                <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                  Streamline Every <br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Competition</span>
                </h1>
                   
                <div className="block lg:hidden my-8 mx-auto w-full max-w-lg">
                  <div className="relative aspect-[4/3] w-full">
                    <MandalaBackground currentIndex={currentIndex} />
                    <AnimatePresence mode="wait">

                      <motion.img
                        key={currentIndex}
                        src={images[currentIndex]}
                        alt={`Platform Illustration Mobile ${currentIndex + 1}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute top-0 left-0 w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                      />
                    </AnimatePresence>
                  </div>
                </div>

                <p className="mb-8 text-lg leading-relaxed text-slate-600">
                  The all-in-one platform for schools and colleges to manage competitions, teams, scores, and results with ease and transparency.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row items-center">
                  <Link to="/entry" className="inline-flex justify-center rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto">
                    I'm from an Institution
                  </Link>
                  <Link to="/entry" className="inline-flex justify-center px-6 py-3.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all focus:outline-none w-full sm:w-auto">
                    I'm an Individual
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block relative mx-auto w-full max-w-xl lg:max-w-none">
                <div className="relative aspect-[4/3] w-full">
                  <MandalaBackground currentIndex={currentIndex} />
                  <AnimatePresence mode="wait">

                    <motion.img
                      key={currentIndex}
                      src={images[currentIndex]}
                      alt={`Platform Illustration ${currentIndex + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute top-0 left-0 w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                    />
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>

      

       
        
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Resonance Logo" className="h-6 w-auto grayscale opacity-50" />
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Resonance. All rights reserved.
            </p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

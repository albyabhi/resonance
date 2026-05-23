import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Users, LayoutDashboard, Target, LogOut, ArrowRight, Loader2, Building2, Calendar, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

import img1 from '../assets/1.png';
import img2 from '../assets/2.png';
import img3 from '../assets/3.png';
import img4 from '../assets/4.png';
import img5 from '../assets/5.png';
import MandalaBackground from '../components/MandalaBackground';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../utils/apiClient';


export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, logout, setLastCompetition, token, refreshToken } = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [img1, img2, img3, img4, img5];

  const [adminCompetitions, setAdminCompetitions] = useState([]);
  const [participantCompetitions, setParticipantCompetitions] = useState([]);
  const [loadingComps, setLoadingComps] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAdminCompetitions([]);
      setParticipantCompetitions([]);
      return;
    }

    const fetchUserCompetitions = async () => {
      setLoadingComps(true);
      try {
        const res = await apiFetch(`${backendUrl}/api/competition/my`);
        if (!res.ok) throw new Error('Failed to fetch workspaces');
        const data = await res.json();
        
        if (data) {
          setAdminCompetitions(data.adminCompetitions || []);
          setParticipantCompetitions(data.participantCompetitions || []);
        }
      } catch (err) {
        console.error("Error loading workspaces:", err);
      } finally {
        setLoadingComps(false);
      }
    };

    fetchUserCompetitions();
  }, [isAuthenticated, backendUrl]);

  const handleSelectCompetition = async (compId) => {
    try {
      const res = await apiFetch(`${backendUrl}/api/auth/competition/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_id: compId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to select competition');
      
      // Update local auth context
      login(data.user, data.access_token || token, data.refresh_token || refreshToken, data.competition);
      setLastCompetition(data.competition);
      
      toast.success(`Entered: ${data.competition.name}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to switch workspace');
    }
  };

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
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-full">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm select-none">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{user?.name}</span>
                </div>
                <button 
                  onClick={() => logout()}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer border border-slate-200 py-1.5 px-3 rounded-lg hover:border-red-200 flex items-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors md:block">Login</Link>
                <Link to="/signup" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
                  Get Started
                </Link>
              </>
            )}
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
                {isAuthenticated ? (
                  <div className="flex flex-col gap-4 sm:flex-row items-center w-full sm:w-auto">
                    {(adminCompetitions.length > 0 || participantCompetitions.length > 0) ? (
                      <>
                        <a href="#continue-section" className="inline-flex justify-center rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all w-full sm:w-auto items-center gap-2 text-center">
                          Continue to your Competitions
                          <ArrowRight className="h-4 w-4" />
                        </a>
                        {(user?.role === 'admin' || user?.membership_role === 'admin') && (
                          <Link to="/setup" className="inline-flex justify-center px-6 py-3.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all focus:outline-none w-full sm:w-auto text-center border border-slate-200 hover:bg-slate-50 rounded-lg">
                            Create New Competition
                          </Link>
                        )}
                      </>
                    ) : (
                      user?.role === 'admin' || user?.membership_role === 'admin' ? (
                        <Link to="/setup" className="inline-flex justify-center rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all w-full sm:w-auto text-center">
                          Create New Competition
                        </Link>
                      ) : (
                        <div className="text-sm font-medium text-slate-500 bg-slate-100 py-3 px-6 rounded-lg">
                          Welcome! You haven't joined any competitions yet.
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row items-center w-full sm:w-auto">
                    <Link to="/signup" className="inline-flex justify-center rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto text-center">
                      Create New Competition
                    </Link>
                    <Link to="/login" className="inline-flex justify-center px-6 py-3.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all focus:outline-none w-full sm:w-auto text-center border border-slate-200 hover:bg-slate-50 rounded-lg">
                      Login to Account
                    </Link>
                  </div>
                )}
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

        {/* Continue Section */}
        {isAuthenticated && (loadingComps || adminCompetitions.length > 0 || participantCompetitions.length > 0) && (
          <section id="continue-section" className="py-20 border-t border-slate-200 bg-slate-50/50 scroll-mt-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-12 max-w-2xl">
                <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-700 uppercase mb-4">
                  Welcome back
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Resume your Journey
                </h2>
                <p className="mt-4 text-slate-600">
                  Select a competition workspace below to manage events, submit/approve scores, or track live leaderboards.
                </p>
              </div>

              {loadingComps ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  <span className="ml-2 text-slate-500 font-medium">Loading your competitions...</span>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Admin Competitions */}
                  {adminCompetitions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Admin Workspace
                      </h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {adminCompetitions.map((comp) => (
                          <div
                            key={comp._id}
                            onClick={() => handleSelectCompetition(comp._id)}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-400 hover:shadow-md animate-fade-in"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Trophy className="h-6 w-6" />
                              </div>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 capitalize">
                                Admin
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                              {comp.name}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {comp.year || new Date().getFullYear()}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 capitalize">
                                {comp.type?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Participant Competitions */}
                  {participantCompetitions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Award className="h-5 w-5 text-indigo-600" />
                        Joined as Participant
                      </h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {participantCompetitions.map((comp) => (
                          <div
                            key={comp._id}
                            onClick={() => handleSelectCompetition(comp._id)}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md animate-fade-in"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Users className="h-6 w-6" />
                              </div>
                              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 capitalize">
                                Participant
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                              {comp.name}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {comp.year || new Date().getFullYear()}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 capitalize">
                                {comp.type?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
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

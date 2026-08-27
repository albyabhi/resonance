import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Users, LayoutDashboard, Target, LogOut, ArrowRight, Loader2, Building2, Calendar, Award } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';


import img1 from '../assets/1.png';
import img2 from '../assets/2.png';
import img3 from '../assets/3.png';
import img4 from '../assets/4.png';
import img5 from '../assets/5.png';
import MandalaBackground from '../components/MandalaBackground';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../utils/apiClient';
import { normalizeRole, roleConfig } from '../components/dashboard/roleConfig';


export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, logout, token, refreshToken } = useAuth();
  
  // Theme is forced to light by ThemeContext when pathname === '/' — no manual override needed
  
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
      
      toast.success(`Entered: ${data.competition.name}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to switch workspace');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground selection:bg-accent-blue-tint">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <div className="accent-stripe" />
        <div className="mx-auto flex max-w-7xl items-center justify-between" style={{ padding: "20px 7%" }}>
          <div className="flex items-center gap-2">
            <span className="text-[25px] font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Reson<span style={{ color: "var(--destructive)" }}>ance</span>
            </span>
          </div>
          
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-[13px] font-medium transition-colors" style={{ color: "var(--muted-foreground)" }}>Features</a>
            <a href="#how-it-works" className="text-[13px] font-medium transition-colors" style={{ color: "var(--muted-foreground)" }}>How It Works</a>
            <a href="#pricing" className="text-[13px] font-medium transition-colors" style={{ color: "var(--muted-foreground)" }}>Pricing</a>
            <a href="#about" className="text-[13px] font-medium transition-colors" style={{ color: "var(--muted-foreground)" }}>About Us</a>
            <a href="#contact" className="text-[13px] font-medium transition-colors" style={{ color: "var(--muted-foreground)" }}>Contact</a>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 py-1.5 px-3 rounded-full" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border-gold)" }}>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm select-none" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-sm font-semibold hidden sm:inline" style={{ color: "var(--foreground)" }}>{user?.name}</span>
                </div>
                <button 
                  onClick={() => logout()}
                  className="text-xs font-semibold transition-colors cursor-pointer py-1.5 px-3 rounded-full flex items-center gap-1.5"
                  style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden text-[13px] font-medium transition-colors md:block" style={{ color: "var(--muted-foreground)" }}>Login</Link>
                <Link to="/signup" className="rounded-full px-5 py-2.5 text-[13px] font-semibold transition-colors" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative" style={{ minHeight: "520px", padding: "76px 7% 64px" }}>
          <div className="mx-auto max-w-7xl relative z-10">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
              <div style={{ maxWidth: "555px" }}>
                <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase mb-6"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--destructive)", backgroundColor: "var(--accent-amber-tint)" }}>
                  &#10022; Competitions, with soul
                </span>
                <h1 className="mb-6" style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(47px, 6vw, 76px)", lineHeight: 0.94, letterSpacing: "-0.03em", color: "var(--foreground)" }}>
                  Streamline Every <br />
                  <span style={{ color: "var(--destructive)" }}>Competition</span>
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

                <p className="mb-8 text-lg leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  The all-in-one platform for schools and colleges to manage competitions, teams, scores, and results with ease and transparency.
                </p>
                {isAuthenticated ? (
                  <div className="flex flex-col gap-4 sm:flex-row items-center w-full sm:w-auto">
                    {(adminCompetitions.length > 0 || participantCompetitions.length > 0) ? (
                      <>
                        <a href="#continue-section" className="inline-flex justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-all w-full sm:w-auto items-center gap-2 text-center"
                          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", padding: "14px 21px" }}>
                          Continue to your Competitions
                          <ArrowRight className="h-4 w-4" />
                        </a>
                        <Link to="/setup" className="inline-flex justify-center px-6 py-3.5 text-sm font-semibold transition-all focus:outline-none w-full sm:w-auto text-center rounded-full"
                          style={{ color: "var(--foreground)", border: "1px solid var(--border-gold)" }}>
                          Create New Competition
                        </Link>
                      </>
                    ) : (
                      <Link to="/setup" className="inline-flex justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-all w-full sm:w-auto text-center"
                        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
                        Create New Competition
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row items-center w-full sm:w-auto">
                    <Link to="/signup" className="inline-flex justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-all focus:outline-none w-full sm:w-auto text-center"
                      style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", padding: "14px 21px" }}>
                      Create New Competition
                    </Link>
                    <Link to="/login" className="inline-flex justify-center px-6 py-3.5 text-sm font-semibold transition-all focus:outline-none w-full sm:w-auto text-center rounded-full"
                      style={{ color: "var(--foreground)", border: "1px solid var(--border-gold)" }}>
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
          <section id="continue-section" className="py-20 scroll-mt-20" style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--accent-amber-tint)" }}>
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-12 max-w-2xl">
                <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase mb-4"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--secondary)", backgroundColor: "var(--accent-purple-tint)" }}>
                  Welcome back
                </span>
                <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--foreground)", fontSize: "clamp(28px, 3vw, 36px)" }}>
                  Resume your Journey
                </h2>
                <p className="mt-4" style={{ color: "var(--muted-foreground)" }}>
                  Select a competition workspace below to manage events, submit/approve scores, or track live leaderboards.
                </p>
              </div>

              {loadingComps ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
                  <span className="ml-2 font-medium" style={{ color: "var(--muted-foreground)" }}>Loading your competitions...</span>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Admin Competitions */}
                  {adminCompetitions.length > 0 && (() => {
                    const roleKeys = adminCompetitions.map(c => normalizeRole(c.membership_role));
                    const uniqueRoles = [...new Set(roleKeys)];
                    const sectionTitle = uniqueRoles.length === 1
                      ? `${roleConfig[uniqueRoles[0]]?.title || uniqueRoles[0]} Workspaces`
                      : "Staff Workspaces";
                    return (
                    <div>
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                        <Building2 className="h-5 w-5" style={{ color: "var(--primary)" }} />
                        {sectionTitle}
                      </h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {adminCompetitions.map((comp) => {
                          const roleKey = normalizeRole(comp.membership_role);
                          const roleTitle = roleConfig[roleKey]?.title || comp.membership_role || "Staff";
                          return (
                          <div
                            key={comp._id}
                            onClick={() => handleSelectCompetition(comp._id)}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1 animate-fade-in"
                            style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-all"
                                style={{ backgroundColor: "var(--accent-amber-tint)", color: "var(--primary)" }}>
                                <Trophy className="h-6 w-6" />
                              </div>
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                                style={{ backgroundColor: "var(--accent-teal-tint)", color: "var(--accent-teal)" }}>
                                {roleTitle}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold mb-2 transition-colors"
                              style={{ color: "var(--foreground)" }}>
                              {comp.name}
                            </h4>
                            <div className="flex items-center gap-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {comp.year || new Date().getFullYear()}
                              </span>
                              <span className="rounded px-2 py-0.5 text-xs font-semibold capitalize"
                                style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                                {comp.type?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })()}

                  {/* Participant Competitions */}
                  {participantCompetitions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                        <Award className="h-5 w-5" style={{ color: "var(--secondary)" }} />
                        Joined as Participant
                      </h3>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {participantCompetitions.map((comp) => (
                          <div
                            key={comp._id}
                            onClick={() => handleSelectCompetition(comp._id)}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1 animate-fade-in"
                            style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-all"
                                style={{ backgroundColor: "var(--accent-blue-tint)", color: "var(--secondary)" }}>
                                <Users className="h-6 w-6" />
                              </div>
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
                                style={{ backgroundColor: "var(--accent-purple-tint)", color: "var(--secondary)" }}>
                                Participant
                              </span>
                            </div>
                            <h4 className="text-lg font-bold mb-2 transition-colors"
                              style={{ color: "var(--foreground)" }}>
                              {comp.name}
                            </h4>
                            <div className="flex items-center gap-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {comp.year || new Date().getFullYear()}
                              </span>
                              <span className="rounded px-2 py-0.5 text-xs font-semibold capitalize"
                                style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
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
      <footer style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--card)" }} className="py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              &copy; {new Date().getFullYear()} Resonance. All rights reserved.
            </p>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Developed by <a href="https://alby-ab.vercel.app/" target="_blank" rel="noopener noreferrer" className="underline transition-colors hover:text-foreground">Alby</a>
            </p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-sm transition-colors" style={{ color: "var(--muted-foreground)" }}>Privacy Policy</a>
            <a href="#" className="text-sm transition-colors" style={{ color: "var(--muted-foreground)" }}>Terms of Service</a>
            <a href="#" className="text-sm transition-colors" style={{ color: "var(--muted-foreground)" }}>Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

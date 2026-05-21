import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import { Trophy, Sparkles } from "lucide-react";

export default function ParticipateRedirectPage() {
  const { eventId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && user) {
      if (user.role === "participant") {
        navigate(`/dashboard/event-registration?eventId=${eventId}`, { replace: true });
      } else {
        toast("You are logged in as Staff. Redirecting to Events Panel.", { icon: "ℹ️" });
        navigate("/dashboard/manage-events", { replace: true });
      }
    } else {
      // Not logged in -> redirect to participant login page
      navigate(`/participant-login?eventId=${eventId}`, { replace: true });
    }
  }, [token, user, eventId, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="relative inline-flex">
          <Trophy className="h-16 w-16 text-indigo-500 animate-bounce" />
          <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Accessing Event Portal...</h2>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full w-1/2" style={{ animation: "infinite-loading 1.6s infinite linear" }} />
        </div>
      </div>
      <style>{`@keyframes infinite-loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
    </div>
  );
}

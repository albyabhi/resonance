import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Trash2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const MyScores = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sheets, setSheets] = useState([]);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });
  };

  const loadSheets = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await apiCall("/api/judge/scores");
      setSheets(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadSheets();
  }, [token]);

  const deleteSheet = async (id) => {
    if (!window.confirm("Delete this score sheet permanently?")) return;
    try {
      await apiCall(`/api/judge/scores/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ scores: [], status: "draft" }),
      });
      toast.success("Score sheet cleared");
      await loadSheets();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const statusBadge = (status) => {
    const map = {
      draft: "secondary",
      submitted: "success",
      rescored: "outline",
    };
    const label = status === "rescored" ? "Re-scored" : status;
    return <Badge variant={map[status] || "outline"}>{label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Scores</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your submitted, draft, and rescored score sheets.
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : sheets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scores submitted yet. Go to My Assignments to score participants.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Chest #</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell>{s.event_id?.name || "\u2014"}</TableCell>
                    <TableCell>
                      {s.chest_no || s.team_id?.chest_no || "\u2014"}
                    </TableCell>
                    <TableCell>{s.round_no || 1}</TableCell>
                    <TableCell className="font-medium">
                      {s.total_score?.toFixed(1) || "\u2014"}
                    </TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.submitted_at
                        ? new Date(s.submitted_at).toLocaleDateString()
                        : "\u2014"}
                    </TableCell>
                    <TableCell>
                      {s.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSheet(s._id)}
                          title="Clear score sheet"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {s.status === "rescored" && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RotateCcw className="h-3 w-3" /> Rescored
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyScores;

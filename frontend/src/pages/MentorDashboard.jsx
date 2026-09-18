import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import "./Dashboard.css";
import { socket } from "../socket";

const API_URL = "http://localhost:5000/api";

function MentorDashboard() {
  const [doubts, setDoubts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState("open");
  const [updatingId, setUpdatingId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editAnswer, setEditAnswer] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [totalDoubts, setTotalDoubts] = useState(0);
  const [totalOpenDoubts, setTotalOpenDoubts] = useState(0);
  const [totalResolvedDoubts, setTotalResolvedDoubts] = useState(0);
  const userName = sessionStorage.getItem("userName");
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchDoubts = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/doubts?page=1&limit=10",
      );
      setDoubts(Array.isArray(res.data) ? res.data : res.data.doubts || []);
      setHasMore(res.data.length === 10);
      setPage(1);
    } catch (err) {
      console.error("Error fetching doubts:", err);
    }
  };

  const loadMoreDoubts = async () => {
    try {
      setLoadingMore(true);

      const nextPage = page + 1;
      const res = await axios.get(
        `http://localhost:5000/api/doubts?page=${nextPage}&limit=10`,
      );

      const newDoubts = Array.isArray(res.data)
        ? res.data
        : res.data.doubts || [];

      setDoubts((prevDoubts) => [...prevDoubts, ...newDoubts]);
      setPage(nextPage);
      setHasMore(newDoubts.length === 10);
    } catch (err) {
      console.error("Error loading more doubts:", err);
    } finally {
      setLoadingMore(false);
    }
  };
  const fetchDoubtStats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/doubts/stats");

      setTotalDoubts(res.data.totalDoubts);
      setTotalOpenDoubts(res.data.openDoubts);
      setTotalResolvedDoubts(res.data.resolvedDoubts);
    } catch (err) {
      console.error("Error fetching doubt statistics:", err);
    }
  };

  useEffect(() => {
    fetchDoubts();
    fetchDoubtStats();

    const token = sessionStorage.getItem("token");

    if (!token) {
      console.warn("No authentication token found for Socket.IO");
      return;
    }

    socket.auth = {
      token,
    };

    socket.connect();

    socket.on("connect", () => {
      console.log("Socket.IO connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error.message);
    });

    socket.on("doubt:created", () => {
      fetchDoubts();
      fetchDoubtStats();
    });

    socket.on("doubt:updated", () => {
      fetchDoubts();
      fetchDoubtStats();
    });

    socket.on("doubt:deleted", () => {
      fetchDoubts();
      fetchDoubtStats();
    });

    socket.on("notification", (data) => {
      console.log("Live notification received:", data);

      window.dispatchEvent(
        new CustomEvent("peerhelp:notification", {
          detail: data,
        }),
      );

      setNotifications((prev) => [...prev, data]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("doubt:created");
      socket.off("doubt:updated");
      socket.off("doubt:deleted");
      socket.off("notification");
      socket.disconnect();
    };
  }, []);

  const markResolved = async (id) => {
    const answer = answers[id]?.trim();

    if (!answer) {
      alert("Please write an answer before marking the doubt as resolved.");
      return;
    }

    setUpdatingId(id);

    try {
      await axios.put(
        `${API_URL}/doubts/${id}`,
        {
          answer,
          status: "resolved",
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        },
      );

      setAnswers((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      await fetchDoubts();
      await fetchDoubtStats();
    } catch (err) {
      console.error("Error updating doubt:", err);
      alert(err.response?.data?.error || "Failed to resolve doubt.");
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditingAnswer = (doubt) => {
    setEditingAnswerId(doubt._id);
    setEditAnswer(doubt.answer || "");
  };

  const cancelEditingAnswer = () => {
    setEditingAnswerId(null);
    setEditAnswer("");
  };

  const saveEditedAnswer = async (id) => {
    const answer = editAnswer.trim();

    if (!answer) {
      alert("Answer cannot be empty.");
      return;
    }

    setUpdatingId(id);

    try {
      await axios.put(
        `${API_URL}/doubts/${id}`,
        {
          answer,
          status: "resolved",
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        },
      );

      cancelEditingAnswer();
      await fetchDoubts();
      await fetchDoubtStats();
    } catch (err) {
      console.error("Error updating answer:", err);
      alert(err.response?.data?.error || "Failed to update answer.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openCount = totalOpenDoubts;
  const resolvedCount = totalResolvedDoubts;

  const visibleDoubts =
    filter === "all" ? doubts : doubts.filter((d) => d.status === filter);

  const formatDoubtDate = (timestamp) => {
    if (!timestamp) return "Date unavailable";

    const date = new Date(timestamp);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  return (
    <div className="dashboard">
      <section className="dashboard-header">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Welcome back, {userName || "Mentor"} 🧑‍🏫
        </motion.h1>
        <p>Help students by answering open doubts and marking them resolved.</p>
      </section>

      <section className="stats-row">
        <div className="stat-card">
          <span className="stat-number">{totalDoubts}</span>{" "}
          <span className="stat-label">Total doubts</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{openCount}</span>
          <span className="stat-label">Awaiting help</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{resolvedCount}</span>
          <span className="stat-label">Resolved</span>
        </div>
      </section>

      <div className="filter-tabs">
        <button
          className={filter === "open" ? "filter-tab active" : "filter-tab"}
          onClick={() => setFilter("open")}
        >
          Open
        </button>
        <button
          className={filter === "resolved" ? "filter-tab active" : "filter-tab"}
          onClick={() => setFilter("resolved")}
        >
          Resolved
        </button>
        <button
          className={filter === "all" ? "filter-tab active" : "filter-tab"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
      </div>

      <section className="doubts-section">
        {visibleDoubts.length === 0 && (
          <p className="empty-state">Nothing here right now.</p>
        )}

        <div className="doubts-grid">
          {visibleDoubts.map((doubt, i) => (
            <motion.div
              className="doubt-card"
              key={doubt._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <div className="doubt-card-top">
                <span className="subject-tag">{doubt.subject}</span>
                <span className={`status-tag ${doubt.status}`}>
                  {doubt.status}
                </span>
              </div>

              <div className="doubt-user">
                Asked by{" "}
                <strong>
                  @
                  {doubt.userId?.username ||
                    doubt.userId?.name ||
                    "Unknown user"}
                </strong>
              </div>
              <h3>{doubt.title}</h3>
              <p className="doubt-date">
                Posted on: {formatDoubtDate(doubt.createdAt)}
              </p>
              <p>{doubt.description}</p>

              {doubt.status === "open" && (
                <div className="mentor-answer-section">
                  <label htmlFor={`answer-${doubt._id}`}>Your Answer</label>

                  <textarea
                    id={`answer-${doubt._id}`}
                    placeholder="Explain the solution to the student's doubt..."
                    value={answers[doubt._id] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [doubt._id]: e.target.value,
                      }))
                    }
                    rows={4}
                  />

                  <button
                    className="btn-ghost mark-resolved-btn"
                    onClick={() => markResolved(doubt._id)}
                    disabled={updatingId === doubt._id}
                  >
                    {updatingId === doubt._id
                      ? "Resolving..."
                      : "Mark as resolved"}
                  </button>
                </div>
              )}

              {doubt.status === "resolved" && doubt.answer && (
                <div className="mentor-answer-display">
                  <div className="mentor-answer-header">
                    <div>
                      <strong>Mentor's Answer</strong>

                      {doubt.resolvedBy && (
                        <div className="resolved-by">
                          Resolved by{" "}
                          <strong>
                            @
                            {doubt.resolvedBy.username || doubt.resolvedBy.name}
                          </strong>
                        </div>
                      )}
                      <p className="mentor-resolved-date">
                        Resolved on: {formatDoubtDate(doubt.updatedAt)}
                      </p>
                    </div>

                    {editingAnswerId !== doubt._id && (
                      <button
                        type="button"
                        className="btn-ghost edit-answer-btn"
                        onClick={() => startEditingAnswer(doubt)}
                      >
                        Edit Answer
                      </button>
                    )}
                  </div>

                  {editingAnswerId === doubt._id ? (
                    <div className="mentor-answer-edit">
                      <textarea
                        value={editAnswer}
                        onChange={(e) => setEditAnswer(e.target.value)}
                        rows={5}
                        placeholder="Update your answer..."
                      />

                      <div className="answer-edit-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => saveEditedAnswer(doubt._id)}
                          disabled={updatingId === doubt._id}
                        >
                          {updatingId === doubt._id
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={cancelEditingAnswer}
                          disabled={updatingId === doubt._id}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{doubt.answer}</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {hasMore && (
          <div className="load-more-wrapper">
            <button
              type="button"
              className="btn-primary"
              onClick={loadMoreDoubts}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default MentorDashboard;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import "./Dashboard.css";
import { socket } from "../socket";

const API_URL = "http://localhost:5000/api";

function StudentDashboard() {
  const [doubts, setDoubts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalDoubts, setTotalDoubts] = useState(0);
  const [totalOpenDoubts, setTotalOpenDoubts] = useState(0);
  const [totalResolvedDoubts, setTotalResolvedDoubts] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const token = sessionStorage.getItem("token");
  const userName = sessionStorage.getItem("userName");

  const fetchDoubts = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/doubts?page=1&limit=10",
      );
      setDoubts(Array.isArray(res.data) ? res.data : res.data.doubts || []);
      setHasMore(res.data.length === 10);
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

    socket.on("doubt:updated", () => {
      fetchDoubts();
      fetchDoubtStats();
    });

    socket.on("doubt:created", () => {
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
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("doubt:updated");
      socket.off("doubt:created");
      socket.off("doubt:deleted");
      socket.off("notification");
      socket.disconnect();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPosting(true);
    try {
      await axios.post(
        `${API_URL}/doubts`,
        { title, description, subject },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setTitle("");
      setDescription("");
      setSubject("");
      setShowForm(false);
      fetchDoubts();
      fetchDoubtStats();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to post doubt.");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const id = deleteTarget._id;

    setDeletingId(id);

    try {
      await axios.delete(`${API_URL}/doubts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDeleteTarget(null);
      await fetchDoubts();
    } catch (err) {
      console.error("Error deleting doubt:", err);

      alert(
        err.response?.data?.error ||
          "Failed to delete doubt. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (doubt) => {
    setEditingId(doubt._id);
    setEditTitle(doubt.title);
    setEditDescription(doubt.description);
    setEditSubject(doubt.subject);
    setError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditSubject("");
    setError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUpdating(true);

    try {
      await axios.put(
        `${API_URL}/doubts/${editingId}`,
        {
          title: editTitle,
          description: editDescription,
          subject: editSubject,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      cancelEditing();
      fetchDoubts();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update doubt.");
    } finally {
      setUpdating(false);
    }
  };

  const myDoubts = doubts;
  const openCount = totalOpenDoubts;
  const resolvedCount = totalResolvedDoubts;
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
          Welcome back, {userName || "Student"} 👋
        </motion.h1>
        <p>Ask a question, track your doubts, and get help from mentors.</p>
      </section>

      <section className="stats-row">
        <div className="stat-card">
          <span className="stat-number">{totalDoubts}</span>
          <span className="stat-label">Total doubts</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{openCount}</span>
          <span className="stat-label">Open</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{resolvedCount}</span>
          <span className="stat-label">Resolved</span>
        </div>
      </section>

      <div className="dashboard-action">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "+ Post a new doubt"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="form-wrapper"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            <form onSubmit={handleSubmit} className="doubt-form">
              {error && <div className="form-error">{error}</div>}
              <input
                type="text"
                placeholder="What's your doubt about?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="Explain it in a bit more detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Subject (e.g. JavaScript, Calculus)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary" disabled={posting}>
                {posting ? "Posting..." : "Post Doubt"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="doubts-section">
        <h2>Your doubts feed</h2>

        {myDoubts.length === 0 && (
          <p className="empty-state">
            No doubts yet. Post your first one above!
          </p>
        )}

        <div className="doubts-grid">
          {myDoubts.map((doubt, i) => (
            <motion.div
              className="doubt-card"
              key={doubt._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              {editingId === doubt._id ? (
                <form onSubmit={handleEditSubmit} className="doubt-form">
                  {error && <div className="form-error">{error}</div>}

                  <div className="form-field">
                    <label htmlFor={`edit-title-${doubt._id}`}>
                      Doubt Title
                    </label>
                    <input
                      id={`edit-title-${doubt._id}`}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="What's your doubt about?"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor={`edit-description-${doubt._id}`}>
                      Description
                    </label>
                    <textarea
                      id={`edit-description-${doubt._id}`}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Explain your doubt in a bit more detail..."
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor={`edit-subject-${doubt._id}`}>Subject</label>
                    <input
                      id={`edit-subject-${doubt._id}`}
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="e.g. JavaScript, Calculus"
                      required
                    />
                  </div>

                  <div className="doubt-edit-actions">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={updating}
                    >
                      {updating ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={cancelEditing}
                      disabled={updating}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="doubt-card-top">
                    <span className="subject-tag">{doubt.subject}</span>
                    <span className={`status-tag ${doubt.status}`}>
                      {doubt.status}
                    </span>
                  </div>

                  <h3>{doubt.title}</h3>
                  <p className="doubt-date">
                    Posted on: {formatDoubtDate(doubt.createdAt)}
                  </p>
                  <p>{doubt.description}</p>

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
                                {doubt.resolvedBy.username ||
                                  doubt.resolvedBy.name}
                              </strong>
                            </div>
                          )}
                          <p className="mentor-resolved-date">
                            Resolved on: {formatDoubtDate(doubt.updatedAt)}
                          </p>
                        </div>
                      </div>

                      <p>{doubt.answer}</p>
                    </div>
                  )}

                  <div className="doubt-actions">
                    {doubt.status === "open" && (
                      <button
                        type="button"
                        className="student-edit-btn"
                        onClick={() => startEditing(doubt)}
                      >
                        Edit
                      </button>
                    )}

                    <button
                      type="button"
                      className="delete-doubt-btn"
                      onClick={() => setDeleteTarget(doubt)}
                      disabled={deletingId === doubt._id}
                    >
                      {deletingId === doubt._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
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
              {loadingMore ? "Loading..." : "Load More"}{" "}
            </button>
          </div>
        )}
      </section>

      {deleteTarget && (
        <AnimatePresence>
          <motion.div
            className="delete-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="delete-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="delete-modal-icon">🗑</div>

              <h3>Delete this doubt?</h3>

              <p>
                This will permanently remove your doubt. You won't be able to
                recover it afterwards.
              </p>

              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="delete-modal-cancel"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingId === deleteTarget._id}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="delete-modal-confirm"
                  onClick={handleDelete}
                  disabled={deletingId === deleteTarget._id}
                >
                  {deletingId === deleteTarget._id
                    ? "Deleting..."
                    : "Yes, Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default StudentDashboard;

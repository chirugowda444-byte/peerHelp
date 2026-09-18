import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const token = sessionStorage.getItem("token");
  const userId = sessionStorage.getItem("userId");
  const userName = sessionStorage.getItem("userName");
  const userRole = sessionStorage.getItem("userRole");

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/notifications",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }

        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    const handleNotification = () => {
      fetchNotifications();
    };

    if (token) {
      fetchNotifications();

      window.addEventListener("peerhelp:notification", handleNotification);
    }

    return () => {
      window.removeEventListener("peerhelp:notification", handleNotification);
    };
  }, [token]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const markNotificationsAsRead = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/notifications/read",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read");
      }

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userUsername");
    sessionStorage.removeItem("userRole");

    navigate("/login");
  };

  return (
    <motion.nav
      className="navbar"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Link to="/" className="navbar-logo">
        PeerHelp
      </Link>

      <div className="navbar-links">
        {token ? (
          <>
            {/* Notification Bell */}
            <div className="notification-wrapper" ref={notificationRef}>
              {" "}
              <button
                className="notification-bell"
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  markNotificationsAsRead();
                }}
                aria-label="Notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    <span>Available for 24 hours</span>
                  </div>

                  {notifications.length === 0 ? (
                    <p>No notifications yet.</p>
                  ) : (
                    notifications.map((notification) => (
                      <div className="notification-item" key={notification._id}>
                        <p>{notification.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Link
              to={userRole === "mentor" ? "/mentor" : "/student"}
              className="navbar-user"
            >
              Hi, {userName || "there"}
            </Link>

            <button className="btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost">
              Log in
            </Link>

            <Link to="/signup" className="btn-primary">
              Sign up
            </Link>
          </>
        )}
      </div>
    </motion.nav>
  );
}

export default Navbar;

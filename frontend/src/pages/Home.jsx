import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import './Home.css';

const features = [
  {
    icon: '💬',
    title: 'Ask anything',
    text: 'Post a doubt in seconds and get it in front of peers who can help.',
  },
  {
    icon: '🎓',
    title: 'Learn from mentors',
    text: 'Experienced students and mentors step in to guide you to the answer.',
  },
  {
    icon: '🤝',
    title: 'Pay it forward',
    text: 'Know the answer to something? Help someone else and build your reputation.',
  },
];

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (token) {
      navigate(userRole === 'mentor' ? '/mentor' : '/student', {
        replace: true,
      });
    }
  }, [navigate]);

  if (localStorage.getItem('token')) {
    return null;
  }

  return (
    <div className="home">
      <section className="hero">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Get unstuck, together.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Post a doubt, get help from peers, and pay it forward when you know the answer.
        </motion.p>
        <motion.div
          className="hero-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link to="/signup" className="btn-primary hero-cta">
            Get started 
          </Link>
          <Link to="/login" className="btn-ghost hero-cta">
            I already have an account
          </Link>
        </motion.div>
      </section>

      <section className="features-section">
        <div className="features-grid">
          {features.map((f, i) => (
            <motion.div
              className="feature-card"
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
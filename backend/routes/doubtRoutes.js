const express = require("express");
const router = express.Router();

module.exports = (io) => {
  const Doubt = require("../models/Doubt");
  const User = require("../models/User");
  const Notification = require("../models/Notification");
  const authMiddleware = require("../middleware/authMiddleware");

  // CREATE - Add a new doubt
  router.post("/", authMiddleware, async (req, res) => {
    try {
      const { title, description, subject } = req.body;

      const student = await User.findById(req.user.id).select("username name");

      if (!student) {
        return res.status(404).json({
          error: "Student not found",
        });
      }

      const doubt = new Doubt({
        title,
        description,
        subject,
        userId: req.user.id,
      });

      await doubt.save();

      const mentors = await User.find({ role: "mentor" }).select("_id");

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await Notification.insertMany(
        mentors.map((mentor) => ({
          recipient: mentor._id,
          type: "new_doubt",
          doubtId: doubt._id,
          message: `${student.username || student.name} posted a new doubt.`,
          expiresAt,
        })),
      );

      io.to("role:mentor").emit("doubt:created", {
        doubtId: doubt._id,
      });

      io.to("role:mentor").emit("notification", {
        type: "new_doubt",
        doubtId: doubt._id,
        message: `${student.username || student.name} posted a new doubt.`,
      });

      io.to("role:student").emit("doubt:created", {
        doubtId: doubt._id,
      });

      res.status(201).json(doubt);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/count", async (req, res) => {
    try {
      const totalDoubts = await Doubt.countDocuments();

      res.json({ totalDoubts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/stats", async (req, res) => {
    try {
      const [totalDoubts, openDoubts, resolvedDoubts] = await Promise.all([
        Doubt.countDocuments(),
        Doubt.countDocuments({ status: "open" }),
        Doubt.countDocuments({ status: "resolved" }),
      ]);

      res.json({
        totalDoubts,
        openDoubts,
        resolvedDoubts,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // READ - Get all doubts
  router.get("/", async (req, res) => {
    try {
      const isPaginated =
        req.query.page !== undefined || req.query.limit !== undefined;

      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

      let query = Doubt.find()
        .select(
          "title description subject userId resolvedBy status answer createdAt updatedAt",
        )
        .populate("userId", "username name")
        .populate("resolvedBy", "username name")
        .sort({ createdAt: -1 });

      if (isPaginated) {
        query = query.skip((page - 1) * limit).limit(limit);
      }

      const doubts = await query.lean();

      res.json(doubts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // READ - Get a single doubt by ID
  router.get("/:id", async (req, res) => {
    try {
      const doubt = await Doubt.findById(req.params.id);
      if (!doubt) return res.status(404).json({ error: "Doubt not found" });
      res.json(doubt);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE - Edit doubt / answer doubt
  router.put("/:id", authMiddleware, async (req, res) => {
    try {
      const doubt = await Doubt.findById(req.params.id);

      if (!doubt) {
        return res.status(404).json({ error: "Doubt not found" });
      }

      // STUDENT: edit their own open doubt
      if (req.user.role === "student") {
        if (!doubt.userId || doubt.userId.toString() !== req.user.id) {
          return res.status(403).json({
            error: "You can only edit your own doubts",
          });
        }

        if (doubt.status !== "open") {
          return res.status(400).json({
            error: "Resolved doubts cannot be edited",
          });
        }

        const { title, description, subject } = req.body;

        doubt.title = title;
        doubt.description = description;
        doubt.subject = subject;

        await doubt.save();

        io.to("role:student").emit("doubt:updated", {
          doubtId: doubt._id,
        });

        io.to("role:mentor").emit("doubt:updated", {
          doubtId: doubt._id,
        });

        return res.json(doubt);
      }

      // MENTOR: answer and resolve a doubt
      if (req.user.role === "mentor") {
        const { answer, status } = req.body;
        const mentor = await User.findById(req.user.id).select("username name");

        if (status !== "resolved") {
          return res.status(400).json({
            error: "Mentors can only resolve doubts",
          });
        }

        if (!answer || !answer.trim()) {
          return res.status(400).json({
            error: "Please provide an answer before resolving the doubt",
          });
        }

        doubt.answer = answer.trim();
        doubt.status = "resolved";
        doubt.resolvedBy = req.user.id;

        await Doubt.updateOne(
          { _id: doubt._id },
          {
            $set: {
              answer: doubt.answer,
              status: doubt.status,
              resolvedBy: doubt.resolvedBy,
            },
          },
        );

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await Notification.create({
          recipient: doubt.userId,
          type: "doubt_resolved",
          doubtId: doubt._id,
          message: `Your doubt has been resolved by mentor ${
            mentor.username || mentor.name
          }.`,
          expiresAt,
        });

        io.to(`user:${doubt.userId}`).emit("notification", {
          type: "doubt_resolved",
          doubtId: doubt._id,
          message: `Your doubt has been resolved by mentor ${mentor.username}.`,
        });

        io.to("role:student").emit("doubt:updated", {
          doubtId: doubt._id,
        });

        io.to("role:mentor").emit("doubt:updated", {
          doubtId: doubt._id,
        });

        return res.json(doubt);
      }

      return res.status(403).json({
        error: "You are not authorized to update this doubt",
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE - Remove a student's own doubt
  router.delete("/:id", authMiddleware, async (req, res) => {
    try {
      // Only students can delete doubts
      if (req.user.role !== "student") {
        return res.status(403).json({
          error: "Only students can delete doubts",
        });
      }

      const doubt = await Doubt.findById(req.params.id);

      if (!doubt) {
        return res.status(404).json({
          error: "Doubt not found",
        });
      }

      // Make sure the doubt belongs to the logged-in student
      if (!doubt.userId || doubt.userId.toString() !== req.user.id) {
        return res.status(403).json({
          error: "You can only delete your own doubts",
        });
      }

      await Doubt.findByIdAndDelete(req.params.id);

      io.to("role:student").emit("doubt:deleted", {
        doubtId: req.params.id,
      });

      io.to("role:mentor").emit("doubt:deleted", {
        doubtId: req.params.id,
      });

      res.json({
        message: "Doubt deleted successfully",
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  });

  return router;
};

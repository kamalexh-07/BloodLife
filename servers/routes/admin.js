const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, verifyAdmin } = require("../middleware/auth");

// Public admin login
router.post("/login", adminController.login);

// All routes below require JWT + admin role
router.use(protect, verifyAdmin);

router.get("/dashboard", adminController.dashboard);
router.get("/me", adminController.me);
router.patch("/me", adminController.updateProfile);
router.post("/change-password", adminController.changePassword);

router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUser);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

router.get("/requests", adminController.listRequests);
router.put("/requests/:id", adminController.updateRequest);
router.delete("/requests/:id", adminController.deleteRequest);

module.exports = router;

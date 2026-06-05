const express = require('express');
const router = express.Router();
const {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes require auth

router.get('/stats', authorize('admin', 'hr', 'senior_manager'), getEmployeeStats);
router.route('/')
    .get(authorize('admin', 'hr', 'senior_manager'), getEmployees)
    .post(authorize('admin', 'hr'), createEmployee);

router.route('/:id')
    .get(authorize('admin', 'hr', 'senior_manager'), getEmployee)
    .put(authorize('admin', 'hr'), updateEmployee)
    .delete(authorize('admin'), deleteEmployee);

module.exports = router;

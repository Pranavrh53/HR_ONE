const express = require('express');
const router = express.Router();
const { getJobs, getJobById, createJob, updateJob, deleteJob } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(getJobs)
    .post(authorize('admin', 'hr'), createJob);

router.route('/:id')
    .get(getJobById)
    .put(authorize('admin', 'hr'), updateJob)
    .delete(authorize('admin', 'hr'), deleteJob);

module.exports = router;

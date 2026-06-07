const express = require('express');
const { handleHrChat } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, handleHrChat);

module.exports = router;

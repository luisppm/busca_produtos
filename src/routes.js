const express = require('express');

const router = express.Router();
const startedAt = Date.now();

router.get('/status', async (req, res) => res.json ({
    uptime: Date.now() - startedAt 
}));

module.exports = router;

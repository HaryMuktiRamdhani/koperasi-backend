const express = require("express");
const { search } = require("../controllers/searchController");

const router = express.Router();
router.get("/", search);

module.exports = router;

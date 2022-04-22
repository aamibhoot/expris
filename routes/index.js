var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.status(200).json({
    success: {
      status: 200,
      message: `Welcome to Expris 🐇`,
      data: {},
    },
  });
});

module.exports = router;

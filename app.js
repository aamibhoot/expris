/**
 * Dependencies Imports
 */
const express = require("express");
const createError = require("http-errors");
const dotenv = require("dotenv");
const logger = require("morgan");
const chalk = require("chalk");
const helmet = require("helmet");
const path = require("path");
const favicon = require("serve-favicon");
const limiter = require("express-rate-limit");
const slowDown = require("express-slow-down");
const responseTime = require("response-time");
const compression = require("compression");
const cors = require("cors");

/**
 * Initialization
 */
const app = express();
dotenv.config();
const log = console.log;
const appPort = process.env.EXPRIS_PORT || 3125; // Expriss Port
app.use(logger("dev"));
/**
 * Init Middlewares
 */
app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(responseTime());

/**
 * Variables & Functions
 */
let delayCap = "5";
function shouldCompress(req, res) {
  if (req.headers["x-no-compression"]) {
    // don't compress responses with this request header
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
}
//Dev Mode
if (process.env.NODE_ENV === "development") {
  delayCap = "25";
  console.log(
    "[ " +
      gradient("green", "yellow")(" MODE ") +
      " ]" +
      chalk.hex("#FFFF00").bold(" 🔨 Development")
  );
  app.use(
    limiter({
      windowMs: 5000, // 15 minutes
      max: 50, // limit each IP to 100 requests per windowMs
      message: {
        code: 429,
        message: "Woow!",
      },
    })
  );
}

//Production Mode
if (process.env.NODE_ENV === "production") {
  delayCap = "15";
  console.log(
    "[" +
      gradient("orange", "yellow")("MODE") +
      "]" +
      chalk.hex("#FFA500").bold(" ⛵️ Production")
  );
  app.use(
    compression({
      level: 6,
      threshold: 6,
      filter: shouldCompress,
    })
  );
  app.use(helmet());
  app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)
  app.use(
    limiter({
      windowMs: 5000, // 15 minutes
      max: 15, // limit each IP to 100 requests per windowMs
      message: {
        code: 429,
        message: "Woow!",
      },
    })
  );
}

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: delayCap, // allow 5 requests to go at full-speed, then...
  delayMs: 1000, // 6th request has a 1000ms delay, 7th has a 2000ms delay, 8th gets 3000ms, etc.
});

/**
 * Init Routes
 */
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/User/users");

app.use("/", indexRouter);
app.use("/users", speedLimiter, usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

/**
 * Error Handler
 */
app.use(async (req, res, next) => {
  next(createError.NotFound());
});
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});

/**
 * Server Start
 */

app.listen(appPort, () => {
  log(
    chalk.cyan("🐇 EXPRIS") +
      chalk.blue(" app running on") +
      chalk.yellow(` http://localhost:${appPort}`)
  );
});

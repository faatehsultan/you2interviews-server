const fs = require("fs");
const path = require("path");
const bunyan = require("bunyan");

const logDirectory = path.join(__dirname, "logs");
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

const logFilePath = path.join(
  logDirectory,
  `${new Date().toISOString().slice(0, 10)}.log`
);

const logger = bunyan.createLogger({
  name: "you2interviews-server",
  streams: [
    {
      path: logFilePath,
    },
  ],
});

class BaseLogger {
  constructor(res, resJson, resStatus = 200) {
    this.req(res?.req);
    this.res(res, resJson, resStatus);
  }

  req = (req) => {
    logger.info(`REQUEST: ${req.url} - query: ${JSON.stringify(req.query)}`);
  };

  res = (res, jsonData = {}, status = 200) => {
    logger.info(`RESPONSE: ${JSON.stringify(jsonData)}`);
    res.status(status).json(jsonData);
  };
}

const log = (res, resJson, resStatus = 200) => {
  return new BaseLogger(res, resJson, resStatus);
};

module.exports = log;

const { createLogger, transports, format } = require('winston');
module.exports = createLogger({
  level: 'debug',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'api.log' })
  ]
});
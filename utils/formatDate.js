const moment = require("moment");

const MONTH_MAP = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12"
};

const getYear = month => {
  const now = new Date();
  if (now.getMonth() + 1 > parseInt(MONTH_MAP[month])) {
    return now.getFullYear() + 1;
  }
  return now.getFullYear();
};

const formatDay = day => {
  if (!day) {
    return "";
  }
  return day.length === 1 ? `0${day}` : day;
};

const formatTime = timeString => {
  if (!timeString) {
    return "INVALID";
  }
  const split = timeString.split(" ");
  if (split.length !== 4) {
    return "INVALID";
  }
  const time = split[1];
  const ampm = split[2];

  const timeMoment = moment(`${time} ${ampm}`, "h:mm a");
  return timeMoment.format("HH:mm");
};

const formatDate = (month, day, time) => {
  return `${getYear(month)}-${MONTH_MAP[month]}-${formatDay(day)}T${formatTime(
    time
  )}:00.000Z`;
};

module.exports = formatDate;

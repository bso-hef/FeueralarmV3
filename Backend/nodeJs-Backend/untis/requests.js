const { Worker, workerData } = require("worker_threads");
const Post = require("../models/post");
const axios = require("axios");
const os = require("os");

const requestURL = process.env.UNTIS_API_KEY;
const authBody = JSON.parse(process.env.UNTIS_AUTH_BODY);
const authHeader = JSON.parse(process.env.UNTIS_AUTH_HEADER);
var requestHeader = JSON.parse(process.env.UNTIS_AUTH_HEADER);
const teacherBody = JSON.parse(process.env.UNTIS_TEACHERS_BODY);
const classesBody = JSON.parse(process.env.UNTIS_CLASSES_BODY);
const roomsBody = JSON.parse(process.env.UNTIS_ROOMS_BODY);
const timeUnitsBody = JSON.parse(process.env.UNTIS_TIMEGRIDUNITS_BODY);
var timetableBody = JSON.parse(process.env.UNTIS_TIMETABLE_BODY);

const workerFile = "./untis/timeTableWorker.js";

exports.getUntisSession = async () => {
  try {
    let resAuth = await axios.post(requestURL, authBody, authHeader);

    if (resAuth.data && resAuth.data.result && resAuth.data.result.sessionId) {
      requestHeader.headers.Cookie = "JSESSIONID=" + resAuth.data.result.sessionId;
      return true;
    } else return false;
  } catch {
    return false;
  }
};

exports.getTeachers = async () => {
  try {
    let resTeachers = await axios.post(requestURL, teacherBody, requestHeader);

    if (resTeachers.data && resTeachers.data.result) {
      let teachers = {};

      for (let teacher of resTeachers.data.result) {
        teachers[teacher.id] = {
          name: teacher.name,
          foreName: teacher.foreName,
          lastName: teacher.longName,
        };
      }

      return teachers;
    }
    return null;
  } catch {
    return null;
  }
};

exports.getClasses = async () => {
  try {
    let resClasses = await axios.post(requestURL, classesBody, requestHeader);

    if (resClasses.data && resClasses.data.result) {
      let classes = {};

      for (let clas of resClasses.data.result) {
        classes[clas.id] = {
          number: clas.name,
          name: clas.longName,
        };
      }

      return classes;
    }
    return null;
  } catch {
    return null;
  }
};

exports.getRooms = async () => {
  try {
    let resRooms = await axios.post(requestURL, roomsBody, requestHeader);

    if (resRooms.data && resRooms.data.result) {
      let rooms = {};

      for (let room of resRooms.data.result) {
        rooms[room.id] = {
          name: room.name,
          longName: room.longName,
        };
      }
      return rooms;
    }
  } catch {
    return null;
  }
};

exports.getTimeUnits = async () => {
  try {
    let resTimeUnits = await axios.post(requestURL, timeUnitsBody, requestHeader);

    if (resTimeUnits.data && resTimeUnits.data.result) {
      let units = {};
      units["not listed"] = {};

      for (let day of resTimeUnits.data.result) {
        for (let unit of day.timeUnits) {
          if (!units[unit.startTime]) units[unit.startTime] = unit.name;
          // else if (units[unit.startTime] != unit.name)
          //     console.log(`Hour ${unit.startTime} -> ${units[unit.startTime]} | ${unit.name}`);
        }
      }

      return units;
    }
    return null;
  } catch {
    return null;
  }
};

exports.getPostsMultiThreaded = async (teachers, classes, rooms, day, time) => {
  try {
    const cpuCount = os.cpus().length;

    let posts = [];
    let workers = [];
    let workLoads = [];
    let workerIndex = 0;

    for (let i = 0; i < cpuCount; i++) workLoads.push({});

    for (let clas in classes) {
      workLoads[workerIndex][clas] = classes[clas];
      workerIndex = (workerIndex + 1) % cpuCount;
    }

    for (let index in workLoads) {
      let data = {
        workLoad: workLoads[index],
        teachers,
        classes,
        rooms,
        day,
        time,
        requestURL,
        requestHeader,
        timetableBody,
      };

      workers.push(
        new Promise((resolve, reject) => {
          const worker = new Worker(workerFile, { workerData: data });
          worker.on("message", resolve);
          worker.on("error", reject);
          worker.on("exit", (code) => {
            if (code != 0) reject(new Error(`Worker stopped with exit code ${code}`));
          });
        })
      );
    }

    values = await Promise.all(workers);
    if (values.length > 0) {
      posts = values[0].posts;
      for (let i = 1; i < values.length; i++) {
        if (values[i].posts && values[i].posts.length > 0) posts = [...posts, ...values[i].posts];
      }
    }

    if (posts.length == 0) return null;
    return posts;
  } catch (e) {
    console.log(e.message);
    return null;
  }
};

exports.getProcessedPostList = (posts) => {
  posts.sort((a, b) => {
    let val = a.class.number.localeCompare(b.class.number);
    if (val == 0) {
      val = a.start - b.start;
    }
    return val;
  });

  let filteredPosts = [];
  let lastNum = "";

  for (let i = 0; i < posts.length; i++) {
    if (posts[i].class.number != lastNum) {
      lastNum = posts[i].class.number;
      filteredPosts.push(posts[i]);
    }
  }

  return filteredPosts;
};

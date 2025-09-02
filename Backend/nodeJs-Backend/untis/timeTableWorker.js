const { parentPort, workerData, isMainThread } = require("worker_threads");
const Post = require("../models/post");
const axios = require("axios");

if (!isMainThread && workerData) {
    doWork(workerData);
}

async function doWork(data) {
    let posts = [];
    try {
        let url = data.requestURL;
        let header = data.requestHeader;
        let body = data.timetableBody;
        let teachers = data.teachers;
        let classes = data.classes;
        let rooms = data.rooms;
        let day = data.day;
        let time = data.time;
        
        for (let clas in workerData.workLoad) {
            body.params.id = clas;
            body.params.startDate = day;
            body.params.endDate = day;  
                  
            let res = await axios.post(url, body, header);            
            let teachersOfLesson = {};
            let roomsOfLesson = {};
            let acceptedTime = null;
            let acceptedLessons = [];
            if (res.data && res.data.result) {
                for (lesson of res.data.result) {                   
                    if ((lesson.startTime >= time && (lesson.startTime - time) <= 15) ||
                        (lesson.endTime > time && lesson.startTime < time)) {                                                     
                        if (!acceptedTime && acceptedLessons.length == 0) {
                            acceptedTime = lesson.startTime;                                                    
                        }

                        if (lesson.startTime == acceptedTime) {
                            let validRooms = lesson.ro.length == 0;
                            if (!validRooms) {
                                for (let room of lesson.ro) {
                                    let id = room.orgid || room.id;
                                    let roomName = rooms[id].name.toLowerCase();
                                    if (roomName.startsWith("r") || roomName.startsWith("l") || roomName.startsWith("mso") ||
                                        roomName === "distanz" || roomName === "extern") { // distanz, extern, mso
                                    }
                                    else validRooms = true;
                                }
                            }                            

                            if (validRooms)
                                acceptedLessons.push(lesson);
                        }                                                
                    }                    
                }         
                
                for (lesson of acceptedLessons) {
                    for (let teacher of lesson.te) {
                        let id = teacher.id;
                        if (id == 0 && teacher.orgid) id = teacher.orgid;
                        if (id != 0) 
                            teachersOfLesson[id] = null;
                        else console.log(lesson.te);                                                                                  
                    }

                    for (let room of lesson.ro) {
                        let id;
                        if (room.orgid) id = room.orgid;
                        else id = room.id;

                        roomsOfLesson[id] = null;
                    }
                }

                if (Object.keys(teachersOfLesson).length > 0) {
                    let className = classes[clas];
                        
                    let teacherNames = [];
                    for (let teacherId in teachersOfLesson) {                        
                        teacherNames.push(teachers[teacherId].foreName + " " +
                            teachers[teacherId].lastName);                        
                    }

                    let roomNames = [];
                    for (let id in roomsOfLesson) {
                        roomNames.push({
                            number: rooms[id].name,
                            name: rooms[id].longName
                        });
                    }

                    let createdTime = new Date();
                    createdTime.setHours(createdTime.getHours() + 1);

                    let post = {
                        class: className,
                        teachers: teacherNames,
                        rooms: roomNames,
                        comment: "",
                        start: acceptedLessons[0].startTime,
                        end: acceptedLessons[0].endTime,
                        day,
                        status: "undefined",
                        created: createdTime,
                        updated: createdTime
                    };

                    // if (post.class.number == "10BVJ1")
                    //     console.log(res.data.result);

                    posts.push(post);    
                }
            }
        }        
        parentPort.postMessage({ message: "finished", posts});
    }
    catch (error) {
        console.log(error.message);
        parentPort.postMessage({ message: error}); 
    }
}
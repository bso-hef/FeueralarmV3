const Post = require("../models/post");
const Alert = require("../models/alert");
const untis = require("../untis/requests");
const permission = require("../middleware/check-permission");


exports.getAlertId = async (data) => {
  if (data && data.alertId) return data.alertId;

  let alerts = await Alert.find({}).sort({ created: -1 })
  if (alerts.length > 0) return alerts[0]._id;
  else return null;
}

exports.fetchPosts = async (alertId) =>  {
  try {       
      let fetchedPosts;

      if (alertId)
          fetchedPosts = await Post.find({alert: alertId}).sort({ class: 1 });

      if (!fetchedPosts || fetchedPosts.length == 0) return {
          success: false,
          msg: "Keine Feueralarme gefunden.",
          posts: []
      };

      return {
          success: true,
          msg: "Laden der Klassen war erfolgreich.",
          posts: fetchedPosts
      };
  }
  catch (error) {
      return {
          success: false,
          msg: error.message,
          posts: []
      };
  }
}

exports.fetchAlerts = async () =>  {
  try {
      let alerts = await Alert.find({});

      if (alerts.length > 0) return {
          success: true,
          msg: "Laden der Feueralarme war erfolgreich.",
          posts: alerts
      };
      else return {
          success: false,
          msg: "Keine Feueralarme gefunden.",
          posts: []
      };
  }
  catch (error) {
      return {
          success: false,
          msg: error.message,
          posts: []
      };
  }
}

exports.updatePost = async (data) =>  {
  let id = data.id;
  let status = data.status;
  let comment = data.comment;

  if (!validUpdateParams(id, status, comment)) 
  return {
      success: false,
      msg: "Die Update-Paramater waren ungültig.",
      posts: []  
  };

  try {
      let post = await Post.findById(id);
      let lastAlertId = await this.getAlertId();

      if (!post.alert.equals(lastAlertId)) return {
          success: false,
          msg: "Diese Klasse ist bereits archiviert.",
          posts: []                    
      };

      let time = new Date();
      time.setHours(time.getHours() + 1);

      post.updated = time;
      post.status = status || post.status;
      post.comment = comment || post.comment;

      try {
          let result = await Post.updateOne({_id: post._id}, post);

          if (result.n > 0) {
              result = await Alert.updateOne({_id: post.alert}, {updated: time});
              
              return {                
                  success: true,
                  msg: "Update der Klasse war erfolgreich.",
                  posts: [post]                      
              };
          }
          else return {
              success: false,
              msg: "Die Klasse konnte nicht upgedated werden.",
              posts: []                    
          };
      }
      catch (err) {
          return {
              success: false,
              msg: err.message,
              posts: []  
          };
      }
  }
  catch (err) {
      return {
          success: false,
          msg: err.message,
          posts: []  
      };
  }
}

function validUpdateParams(id, status, comment) {
  if (id && id !== "" && (status || comment)) {
      if (status) status = status.toLowerCase();
      
     return ((status && (status === "invalid" || status === "complete" || status === "incomplete")) ||
             (comment && comment.length> 0));    
  } 
  else return false;       
}

exports.alert = async (data) => { 
  let debugging = false;

  let result = permission.checkPermission(data.token); 

  if (!result.hasPermission) return {
      success: false,
      msg: result.message,
      posts: []  
  };

  if (debugging)
      console.log("start");

  try {
      busyWithUntis = true;
      

      if (! await untis.getUntisSession()) 
      return {
          success: false,
          msg: "Authentifizierung bei WebUntis ist fehlgeschlagen.",
          posts: []  
      };
  
      if (debugging)
          console.log("auth worked");

      let teachers = await untis.getTeachers();
      if (!teachers) return {
          success: false,
          msg: "Abrufen der Lehrer von WebUntis ist fehlgeschlagen.",
          posts: []  
      };

      if (debugging)
          console.log("teachers worked");

      let classes = await untis.getClasses();
      if (!classes) return {
          success: false,
          msg: "Abrufen der Klassen von WebUntis ist fehlgeschlagen.",
          posts: []  
      };

      if (debugging)
          console.log("classes worked");
  
      let rooms = await untis.getRooms();
      if (!rooms) return {
          success: false,
          msg: "Abrufen der Räume von WebUntis ist fehlgeschlagen.",
          posts: []  
      };

      if (debugging)
          console.log("rooms worked");

      let date = new Date();    
      date.setHours(date.getHours() + 1);
      //date.setHours(date.getHours() + 2);
      day = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();     
      if (data.day) day = data.day;
  
      let time = date.getHours() * 100 + date.getMinutes();
      if (data.time && data.time > 0 && data.time < 2400)
      time = data.time; 
  
      posts = await untis.getPostsMultiThreaded(teachers, classes, rooms, day, time);        
      if (!posts) return {
          success: false,
          msg: "Es konnten keine laufenden Unterrichte gefunden werden.",
          posts: []  
      };   

      posts = untis.getProcessedPostList(posts);

      if (debugging)
          console.log("posts worked");
   
      try {
          //let result = await Post.deleteMany({});
          let result = await Alert.updateMany({}, {archived: true});
          //let result = await Alert.deleteMany({});
          let timeStamp = posts[0].created; 
          let alert = await Alert.create({classCount: posts.length, created: timeStamp, updated: timeStamp});            

          try {
              for (let post of posts) post.alert = alert._id;
              result = await Post.create(posts);
              posts = result;

              let alerts = await Alert.find({}).sort({created: 1});
              let deletableAlerts = [];
              let maxAlerts = 20;

              for (let i = 0; i < alerts.length - maxAlerts; i++) {
                  deletableAlerts.push(alerts[i]._id);
              }

              if (deletableAlerts.length > 0) {                    
                  result = await Post.deleteMany({alert: {$exists: false}});
                  result = await Post.deleteMany({alert: {$in: deletableAlerts}});
                  if (result.ok == 1)
                      result = await Alert.deleteMany({_id: {$in: deletableAlerts}});
              }

              return {
                  success: true,
                  msg: "Laden der Klassen war erfolgreich.",
                  posts
              };
          }
          catch (err) {
              Alert.deleteOne({_id: alert._id});

              return {
                  success: false,
                  msg: err.message,
                  posts: []  
              };
          }
      }   
      catch (err) {
          return {
              success: false,
              msg: err.message,
              posts: []  
          };
      } 
  }
  catch (error) {
      console.log(error.message);
      return {
          success: false,
          msg: "Ein unerwartetes Problem ist aufgetreten. -> " + error.message,
          posts: []  
      };
  }  
  finally {
      busyWithUntis = false;
  }
}

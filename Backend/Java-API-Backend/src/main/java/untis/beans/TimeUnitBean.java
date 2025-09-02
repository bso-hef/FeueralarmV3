package untis.beans;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class TimeUnitBean {

    long date;
    Integer[] classIds, teacherIds, roomsIds;
    int startTime, endTime;
    String activityType;

    public TimeUnitBean(long date, Integer[] classIds, Integer[] teacherIds, Integer[] roomsIds, int startTime, int endTime, String activityType) {
        this.date = date;
        this.classIds = classIds;
        this.teacherIds = teacherIds;
        this.roomsIds = roomsIds;
        this.startTime = startTime;
        this.endTime = endTime;
        this.activityType = activityType;
    }

    public long getDate() {
        return date;
    }

    public Integer[] getClassIds() {
        return classIds;
    }

    public Integer[] getTeacherIds() {
        return teacherIds;
    }

    public Integer[] getRoomsIds() {
        return roomsIds;
    }

    public int getStartTime() {
        return startTime;
    }

    public int getEndTime() {
        return endTime;
    }

    public String getActivityType() {
        return activityType;
    }

    public static TimeUnitBean parse(JSONObject object) {
        long date = Long.valueOf(String.valueOf(object.get("date")));
        List<Integer> classIdList = new ArrayList<>();
        for(Object rawClasses : (JSONArray) object.get("kl")) {
            JSONObject classObject = (JSONObject) rawClasses;
            classIdList.add(Integer.valueOf(String.valueOf(classObject.get("id"))));
        }
        Integer[] classIds = classIdList.toArray(new Integer[classIdList.size()]);
        List<Integer> teacherIdList = new ArrayList<>();
        for(Object rawTeachers : (JSONArray) object.get("te")) {
            JSONObject teacherObject = (JSONObject) rawTeachers;
            teacherIdList.add(Integer.valueOf(String.valueOf(teacherObject.get("id"))));
        }
        Integer[] teacherIds = teacherIdList.toArray(new Integer[teacherIdList.size()]);
        List<Integer> roomIdList = new ArrayList<>();
        for(Object rawRooms : (JSONArray) object.get("te")) {
            JSONObject roomObject = (JSONObject) rawRooms;
            roomIdList.add(Integer.valueOf(String.valueOf(roomObject.get("id"))));
        }
        Integer[] roomIds = roomIdList.toArray(new Integer[roomIdList.size()]);

        int startTime = Integer.valueOf(String.valueOf(object.get("startTime")));
        int endTime = Integer.valueOf(String.valueOf(object.get("endTime")));

        String activityType = String.valueOf(object.get("activityType"));
        return new TimeUnitBean(date, classIds, teacherIds, roomIds, startTime, endTime, activityType);
    }

    public static List<TimeUnitBean> parseList(JSONArray jsonArray) {
        List<TimeUnitBean> beanList = new ArrayList<>();
        for(Object rawBean : jsonArray) {
            if(rawBean instanceof JSONObject) {
                JSONObject object = (JSONObject) rawBean;
                beanList.add(parse(object));
            }
        }
        return beanList;
    }

    public static String parseTeacher(TimeUnitBean timeUnit, HashMap<Integer, TeacherBean> teacherMap) {
        StringBuilder builder = new StringBuilder();
        for(int teacherId : timeUnit.getTeacherIds()) {
            TeacherBean teacher = teacherMap.getOrDefault(teacherId, new TeacherBean(-1, "Leer", "Kein", "Lehrer"));
            builder.append(", ").append(teacher.getFullName());
        }
        return builder.toString().replaceFirst(", ", "");
    }
}

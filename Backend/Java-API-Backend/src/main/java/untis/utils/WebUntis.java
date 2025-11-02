package untis.utils;

import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import untis.beans.ClassBean;
import untis.beans.TeacherBean;
import untis.beans.TimeUnitBean;
import utils.RequestWrapper;

import java.util.ArrayList;
import java.util.List;

public class WebUntis {

    public static String getSessionId() {
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            HttpPost httpPost = new HttpPost(ContentConst.REQUEST_URL);
            StringEntity entity = new StringEntity(ContentConst.AUTH_CONTENT);

            httpPost.setEntity(entity);
            httpPost.setHeader("Accept", "application/json");
            httpPost.setHeader("Content-type", "application/json");

            String responseBody = client.execute(httpPost, response -> {
                int status = response.getCode();
                if (status >= 200 && status < 300) {
                    HttpEntity entity1 = response.getEntity();
                    return entity1 != null ? EntityUtils.toString(entity1) : null;
                } else {
                    throw new RuntimeException("Unexpected response status: " + status);
                }
            });

            JSONParser parser = new JSONParser();
            JSONObject object = (JSONObject) parser.parse(responseBody);
            if(object.containsKey("result") && ((JSONObject) object.get("result")).containsKey("sessionId")) {
                return (String) ((JSONObject) object.get("result")).get("sessionId");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public static List<TeacherBean> getTeacherList(String sessionId) {
        List<TeacherBean> beanList = new ArrayList<>();
        JSONObject teacherObject = RequestWrapper.getResponse(ContentConst.TEACHER_CONTENT, sessionId);
        if (teacherObject != null && teacherObject.containsKey("result")) {
            JSONArray jsonArray = (JSONArray) teacherObject.get("result");
            beanList = TeacherBean.parseList(jsonArray);
        }
        return beanList;
    }

    public static List<ClassBean> getClassList(String sessionId) {
        List<ClassBean> beanList = new ArrayList<>();
        JSONObject teacherObject = RequestWrapper.getResponse(ContentConst.CLASS_CONTENT, sessionId);
        if (teacherObject != null && teacherObject.containsKey("result")) {
            JSONArray jsonArray = (JSONArray) teacherObject.get("result");
            beanList = ClassBean.parseList(jsonArray);
        }
        return beanList;
    }

    public static List<TimeUnitBean> getTimeUnitList(String sessionId, int classId) {
        List<TimeUnitBean> beanList = new ArrayList<>();
        String content = ContentConst.TIMETABLE_CONTENT.replace("%classId%", classId + "");
        JSONObject timeTableObject = RequestWrapper.getResponse(content, sessionId);
        if (timeTableObject != null && timeTableObject.containsKey("result") && !((JSONArray) timeTableObject.get("result")).isEmpty()) {
            JSONArray jsonArray = (JSONArray) timeTableObject.get("result");
            beanList = TimeUnitBean.parseList(jsonArray);
        }
        return beanList;
    }
}
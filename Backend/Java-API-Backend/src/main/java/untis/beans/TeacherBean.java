package untis.beans;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class TeacherBean {

    int id;
    String shortName;
    String foreName;
    String name;

    public TeacherBean(int id, String shortName, String foreName, String name) {
        this.id = id;
        this.shortName = shortName;
        this.foreName = foreName;
        this.name = name;
    }

    public int getId() {
        return id;
    }

    public String getShortName() {
        return shortName;
    }

    public String getForeName() {
        return foreName;
    }

    public String getName() {
        return name;
    }

    public String getFullName() {
        return this.foreName + " " + this.name;
    }


    @Override
    public String toString() {
        return "TeacherBean{" +
                "id=" + id +
                ", shortName='" + shortName + '\'' +
                ", foreName='" + foreName + '\'' +
                ", longName='" + name + '\'' +
                '}';
    }

    public static TeacherBean parse(JSONObject object) {
        int id = Integer.valueOf(String.valueOf(object.get("id")));
        String name = String.valueOf(object.get("name"));
        String foreName = String.valueOf(object.get("foreName"));
        String longName = String.valueOf(object.get("longName"));
        return new TeacherBean(id, name, foreName, longName);
    }

    public static List<TeacherBean> parseList(JSONArray jsonArray) {
        List<TeacherBean> beanList = new ArrayList<>();
        for(Object rawBean : jsonArray) {
            if(rawBean instanceof JSONObject) {
                JSONObject object = (JSONObject) rawBean;
                beanList.add(parse(object));
            }
        }

        return beanList;
    }
}

package untis.beans;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class ClassBean {

    int id;
    String name;
    boolean active;
    String longName;


    public ClassBean(int id, String name, boolean active, String longName) {
        this.id = id;
        this.name = name;
        this.active = active;
        this.longName = longName;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public boolean isActive() {
        return active;
    }

    public String getLongName() {
        return longName;
    }

    public static ClassBean parse(JSONObject object) {
        int id = Integer.valueOf(String.valueOf(object.get("id")));
        String name = String.valueOf(object.get("name"));
        boolean active = Boolean.valueOf(String.valueOf(object.get("active")));
        String longName = String.valueOf(object.get("longName"));
        return new ClassBean(id, name, active, longName);
    }

    public static List<ClassBean> parseList(JSONArray jsonArray) {
        List<ClassBean> beanList = new ArrayList<>();
        for(Object rawBean : jsonArray) {
            if(rawBean instanceof JSONObject) {
                JSONObject object = (JSONObject) rawBean;
                beanList.add(parse(object));
            }
        }

        return beanList;
    }
}

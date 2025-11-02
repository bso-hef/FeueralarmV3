package untis.utils;

import config.ConfigLoader;

public class ContentConst {

    // Load from .env file
    public static final String REQUEST_URL = ConfigLoader.getUntisUrl();
    public static final String USERNAME = ConfigLoader.getUntisUsername();
    public static final String PASSWORD = ConfigLoader.getUntisPassword();
    public static final String API_KEY = ConfigLoader.getUntisApiKey();

    public static final String AUTH_CONTENT =
            "{" +
            "\"id\":\"authenticate\"," +
            "\"method\":\"authenticate\"," +
            "\"params\":" +
            "{" +
            "\"user\":\"" + USERNAME + "\"," +
            "\"password\":\"" + PASSWORD + "\"," +
            "\"client\":\"" + API_KEY + "\"" +
            "}," +
            "\"jsonrpc\":\"2.0\"" +
            "}";

    public static final String CLASS_CONTENT =
            "{\"id\":\"get_classes\"," +
            "\"method\":\"getKlassen\"," +
            "\"params\":{}," +
            "\"jsonrpc\":\"2.0\"" +
            "}";

    public static final String TEACHER_CONTENT =
            "{\"id\":\"get_classes\"," +
            "\"method\":\"getTeachers\"," +
            "\"params\":{}," +
            "\"jsonrpc\":\"2.0\"" +
            "}";

    public static final String TIMETABLE_CONTENT =
            "{\"id\":\"req-002\"," +
            "\"method\":\"getTimetable\"," +
            "\"params\":" +
            "{" +
            "\"id\":%classId%," +
            "\"type\":1" +
            "}," +
            "\"jsonrpc\":\"2.0\"" +
            "}";

}
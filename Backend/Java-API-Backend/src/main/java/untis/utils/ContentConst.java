package untis.utils;

public class ContentConst {

    public static final String REQUEST_URL = "https://nessa.webuntis.com/WebUntis/jsonrpc.do?school=BS-Bad+Hersfeld";

    public static final String USERNAME = "Proj12Inf";

    public static final String PASSWORD = "Voellig_Egal12";

    public static final String API_KEY = "W2MCAVAWK62BJJSX";

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

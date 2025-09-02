package untis.utils;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

public class Utils {


    private static void appendIndentedNewLine(int indentLevel, StringBuilder stringBuilder) {
        stringBuilder.append("\n");
        for(int i = 0; i < indentLevel; i++) {
            stringBuilder.append("  ");
        }
    }

    public static String beautifyJson(String unformattedJsonString) {
        StringBuilder prettyJSONBuilder = new StringBuilder();
        int indentLevel = 0;
        boolean inQuote = false;
        for(char charFromUnformattedJson : unformattedJsonString.toCharArray()) {
            switch(charFromUnformattedJson) {
                case '"':
                    // switch the quoting status
                    inQuote = !inQuote;
                    prettyJSONBuilder.append(charFromUnformattedJson);
                    break;
                case ' ':
                    // For space: ignore the space if it is not being quoted.
                    if(inQuote) {
                        prettyJSONBuilder.append(charFromUnformattedJson);
                    }
                    break;
                case '{':
                case '[':
                    // Starting a new block: increase the indent level
                    prettyJSONBuilder.append(charFromUnformattedJson);
                    indentLevel++;
                    appendIndentedNewLine(indentLevel, prettyJSONBuilder);
                    break;
                case '}':
                case ']':
                    // Ending a new block; decrese the indent level
                    indentLevel--;
                    appendIndentedNewLine(indentLevel, prettyJSONBuilder);
                    prettyJSONBuilder.append(charFromUnformattedJson);
                    break;
                case ',':
                    // Ending a json item; create a new line after
                    prettyJSONBuilder.append(charFromUnformattedJson);
                    if(!inQuote) {
                        appendIndentedNewLine(indentLevel, prettyJSONBuilder);
                    }
                    break;
                default:
                    prettyJSONBuilder.append(charFromUnformattedJson);
            }
        }
        return prettyJSONBuilder.toString();
    }

    public static String beautifyTimeLong(long time) {
        String timeString = String.valueOf(time);
        String mins = timeString.substring(2);
        String hours = timeString.substring(0, 2);
        return hours + ":" + mins;
    }

    public static String generateTimeString(long time) {
        String wrapped = Utils.beautifyTimeLong(time);
        SimpleDateFormat sdf = new SimpleDateFormat("dd.MM.yyyy");
        Date date = new Date(System.currentTimeMillis());
        return sdf.format(date) + " " + wrapped;
    }

    public static long parseDate(String time) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("dd.MM.yyyy HH:mm");
            return sdf.parse(time).getTime();
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return -1;
    }

    public static String formatDate(long millis) {
        SimpleDateFormat sdf = new SimpleDateFormat("dd.MM.yyyy HH:mm");
        Date date = new Date(millis);
        return sdf.format(date);
    }

    public static long convertToLong(long time) {
        return Utils.parseDate(Utils.generateTimeString(time));
    }
}

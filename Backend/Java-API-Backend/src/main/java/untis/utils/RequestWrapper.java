package untis.utils;

import org.apache.http.HttpEntity;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;

public class RequestWrapper {

    public static JSONObject getResponse(String content, String sessionId) {
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            HttpPost httpPost = new HttpPost("https://nessa.webuntis.com/WebUntis/jsonrpc.do?school=BS-Bad+Hersfeld");
            StringEntity entity = new StringEntity(content);

            httpPost.setEntity(entity);
            httpPost.setHeader("Accept", "application/json");
            httpPost.setHeader("Content-type", "application/json");
            httpPost.setHeader("Cookie", "JSESSIONID=" + sessionId);

            String responseBody = client.execute(httpPost, response -> {
                int status = response.getStatusLine().getStatusCode();
                if (status >= 200 && status < 300) {
                    HttpEntity entity1 = response.getEntity();
                    return entity1 != null ? EntityUtils.toString(entity1) : null;
                } else {
                    throw new ClientProtocolException("Unexpected response status: " + status);
                }
            });

            JSONParser parser = new JSONParser();
            return (JSONObject) parser.parse(responseBody);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return new JSONObject();
    }
}

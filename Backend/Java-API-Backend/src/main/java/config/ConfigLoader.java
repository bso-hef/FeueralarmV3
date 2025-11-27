package config;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class ConfigLoader {
    private static final Map<String, String> config = new HashMap<>();
    private static boolean initialized = false;

    static {
        loadConfig();
    }

    private static void loadConfig() {
        if (initialized) {
            return;
        }

        // Versuche .env aus verschiedenen Orten zu laden
        String[] possiblePaths = {
            ".env",
            "../.env",
            "../../../../nodeJs-Backend/.env",
            System.getProperty("user.dir") + "/.env"
        };

        for (String path : possiblePaths) {
            if (tryLoadEnvFile(path)) {
                System.out.println("✅ Loaded .env from: " + path);
                initialized = true;
                return;
            }
        }

        System.err.println("⚠️ Warning: .env file not found. Using system environment variables only.");
        initialized = true;
    }

    private static boolean tryLoadEnvFile(String path) {
        try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                
                // Skip comments and empty lines
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

                // Parse KEY=VALUE
                int equalsIndex = line.indexOf('=');
                if (equalsIndex > 0) {
                    String key = line.substring(0, equalsIndex).trim();
                    String value = line.substring(equalsIndex + 1).trim();
                    
                    // Remove quotes if present
                    if (value.startsWith("\"") && value.endsWith("\"")) {
                        value = value.substring(1, value.length() - 1);
                    }
                    
                    config.put(key, value);
                }
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    public static String get(String key) {
        // 1. Try system environment variable first
        String envValue = System.getenv(key);
        if (envValue != null) {
            return envValue;
        }

        // 2. Try .env file
        String configValue = config.get(key);
        if (configValue != null) {
            return configValue;
        }

        // 3. Not found
        return null;
    }

    public static String get(String key, String defaultValue) {
        String value = get(key);
        return value != null ? value : defaultValue;
    }

    // WebUntis specific getters
    public static String getUntisUrl() {
        return get("UNTIS_URL");
    }

    public static String getUntisUsername() {
        return get("UNTIS_USERNAME");
    }

    public static String getUntisPassword() {
        return get("UNTIS_PASSWORD");
    }

    public static String getUntisApiKey() {
        return get("UNTIS_API_KEY");
    }

    // Reload config (useful for testing)
    public static void reload() {
        config.clear();
        initialized = false;
        loadConfig();
    }
}

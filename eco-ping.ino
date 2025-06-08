#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Flex";
const char* password = "12345678_";

// Supabase configuration
const char* supabaseUrl = "https://civgqrdgrofchdjwjxdb.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdmdxcmRncm9mY2hkandqeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzOTY4MjgsImV4cCI6MjA2NDk3MjgyOH0.ezTvKgCOg3CeKx4nviraWx9BCrGWJ5-CJES0hgrj8O0";

// Capacitor sensor pin
const int sensorPin = 10; // Adjust this pin according to your wiring

// Timing configuration
const unsigned long SEND_INTERVAL = 500; // Send data every 5 seconds
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("Starting Capacitor Sensor...");
  
  // Initialize WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check if it's time to send data
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
      sendSensorData();
      lastSendTime = currentTime;
    } else {
      Serial.println("WiFi connection lost. Reconnecting...");
      WiFi.reconnect();
    }
  }
}

void sendSensorData() {
  // Read sensor value
  int sensorValue = analogRead(sensorPin);
  Serial.print("Sensor Value: ");
  Serial.println(sensorValue);
  
  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["sensor_value"] = sensorValue;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send data to Supabase
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/sensor_data";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("Error sending data: " + String(httpResponseCode));
  }
  
  http.end();
}

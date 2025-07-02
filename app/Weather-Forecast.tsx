import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Image,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const OPEN_WEATHER_API_KEY = "120c1d742105474a5f77dbf48559c643";

const getWeatherGradient = (weatherMain: string, colorScheme: string): [string, string] => {
  if (!weatherMain) return colorScheme === "dark"
    ? ["#232946", "#121629"]
    : ["#6E45E2", "#89D4CF"];
  const main = weatherMain.toLowerCase();
  if (main.includes("rain")) return ["#4B79CF", "#4B79CF"];
  if (main.includes("cloud")) return colorScheme === "dark"
    ? ["#44475a", "#232946"]
    : ["#B7B7B7", "#5C5C5C"];
  if (main.includes("sun") || main.includes("clear")) return ["#FF7E5F", "#FEB47B"];
  return colorScheme === "dark"
    ? ["#232946", "#121629"]
    : ["#6E45E2", "#89D4CF"];
};

export default function WeatherForecastScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's current location using expo-location
  const fetchCoords = useCallback(async () => {
    try {
      setError(null);
      setPlace(null);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission not granted.");
        setCoords(null);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode to get place name
      const places = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (places && places.length > 0) {
        setPlace(
          places[0].city ||
          places[0].district ||
          places[0].region ||
          places[0].name ||
          places[0].country ||
          "Unknown"
        );
      } else {
        setPlace("Unknown");
      }
    } catch (e) {
      setCoords(null);
      setPlace(null);
      setError("Failed to fetch device location.");
    }
  }, []);

  // Fetch weather from OpenWeatherMap One Call 3.0 API
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,alerts&appid=${OPEN_WEATHER_API_KEY}`;
      const resp = await axios.get(url);
      setWeather(resp.data);
      setError(null);
    } catch (e) {
      setWeather(null);
      setError("Failed to fetch weather data from OpenWeatherMap.");
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount and refresh: fetch coords, then weather
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWeather(null);
    setCoords(null);
    setPlace(null);
    await fetchCoords();
  }, [fetchCoords]);

  // Fetch coords on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // When coords change, fetch weather
  useEffect(() => {
    if (
      coords &&
      typeof coords.latitude === "number" &&
      typeof coords.longitude === "number"
    ) {
      fetchWeather(coords.latitude, coords.longitude);
    }
  }, [coords, fetchWeather]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await loadAll();
    setRefreshing(false);
  };

  // Helpers
  const formatTime = (timestamp: number) =>
    dayjs.unix(timestamp).format("h A");
  const formatDate = (timestamp: number) =>
    dayjs.unix(timestamp).format("ddd, MMM D");
  const getWindDirection = (deg: number) => {
    const dirs = [
      "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ];
    return dirs[Math.round(deg / 22.5) % 16];
  };
  const getUVLevel = (uvi: number) => {
    if (uvi <= 2) return { level: "Low", color: "#22c55e" };
    if (uvi <= 5) return { level: "Moderate", color: "#eab308" };
    if (uvi <= 7) return { level: "High", color: "#f59e42" };
    if (uvi <= 10) return { level: "Very High", color: "#ef4444" };
    return { level: "Extreme", color: "#a21caf" };
  };

  // Colors
  const bgColor = colorScheme === "dark" ? "#181a20" : "#F8FAFC";
  const cardBg = colorScheme === "dark" ? "#232946" : "#fff";
  const textColor = colorScheme === "dark" ? "#F8FAFC" : "#0F172A";
  const subTextColor = colorScheme === "dark" ? "#94A3B8" : "#64748B";
  const rainColor = "#38bdf8";
  const uvColor = "#fbbf24";

  // Loading UI
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6E45E2" />
        <Text style={{ marginTop: 16, color: subTextColor, fontSize: 16 }}>Loading Weather Data...</Text>
      </SafeAreaView>
    );
  }

  // Error UI
  if (error || !coords) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#ef4444", fontSize: 16, marginBottom: 8 }}>{error || "No coordinates found."}</Text>
        <Text style={{ color: subTextColor, fontSize: 14 }}>Pull to refresh</Text>
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6E45E2"]} />
          }
        />
      </SafeAreaView>
    );
  }

  // Defensive check for weather data
  if (!weather || !weather.current || !weather.hourly || !weather.daily) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#ef4444", fontSize: 16, marginBottom: 8 }}>
          Weather data not available. Please pull to refresh.
        </Text>
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6E45E2"]} />
          }
        />
      </SafeAreaView>
    );
  }

  // Main UI
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6E45E2"]} />
        }
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      >
        {/* Current Weather Card */}
        <LinearGradient
          colors={getWeatherGradient(weather.current.weather[0].main, colorScheme)}
          style={styles.currentWeatherCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.placeText, { color: "#fff" }]}>
              {place ? place : "Fetching location..."}
            </Text>
            <Text style={[styles.coordsText, { color: "#fff" }]}>
              Lat: {coords?.latitude?.toFixed(4)}, Lon: {coords?.longitude?.toFixed(4)}
            </Text>
            <Text style={[styles.tempText, { color: "#fff" }]}>{Math.round(weather.current.temp)}°C</Text>
            <Text style={[styles.descText, { color: "#fff" }]}>{weather.current.weather[0].description}</Text>
            <Text style={[styles.feelsLikeText, { color: "#fff" }]}>
              Feels like {Math.round(weather.current.feels_like)}°C
            </Text>
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <View style={styles.infoItem}>
                <Feather name="wind" size={20} color="#fff" />
                <Text style={styles.infoLabel}>
                  {Math.round(weather.current.wind_speed)} m/s {getWindDirection(weather.current.wind_deg)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="droplet" size={20} color="#fff" />
                <Text style={styles.infoLabel}>{weather.current.humidity}%</Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="sun" size={20} color="#fff" />
                <Text style={styles.infoLabel}>
                  {weather.current.uvi !== undefined
                    ? `${Math.round(weather.current.uvi)} (${getUVLevel(weather.current.uvi).level})`
                    : "N/A"}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              <View style={styles.infoItem}>
                <Feather name="sunrise" size={20} color="#fff" />
                <Text style={styles.infoLabel}>{formatTime(weather.current.sunrise)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="sunset" size={20} color="#fff" />
                <Text style={styles.infoLabel}>{formatTime(weather.current.sunset)}</Text>
              </View>
            </View>
          </View>
          <Image
            source={{
              uri: `https://openweathermap.org/img/wn/${weather.current.weather[0].icon}@4x.png`,
            }}
            style={{ width: isTablet ? 160 : 100, height: isTablet ? 160 : 100 }}
            resizeMode="contain"
          />
        </LinearGradient>

        {/* Hourly Forecast */}
        <View style={[styles.section, { backgroundColor: bgColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Next 24 Hours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {weather.hourly.slice(0, 24).map((hour: any, idx: number) => (
              <View key={idx} style={[styles.hourCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.hourTime, { color: subTextColor }]}>{idx === 0 ? "Now" : formatTime(hour.dt)}</Text>
                <Image
                  source={{
                    uri: `https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png`,
                  }}
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                />
                <Text style={[styles.hourTemp, { color: textColor }]}>{Math.round(hour.temp)}°</Text>
                {hour.pop > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                    <MaterialCommunityIcons name="weather-pouring" size={16} color={rainColor} />
                    <Text style={{ color: rainColor, fontSize: 12, marginLeft: 2 }}>
                      {Math.round(hour.pop * 100)}%
                    </Text>
                  </View>
                )}
                {hour.rain && hour.rain["1h"] && (
                  <Text style={{ color: rainColor, fontSize: 12, marginTop: 2 }}>
                    Rain: {hour.rain["1h"]} mm
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Daily Forecast */}
        <View style={[styles.section, { backgroundColor: bgColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>7-Day Forecast</Text>
          {weather.daily.slice(0, 7).map((day: any, idx: number) => {
            const uv = getUVLevel(day.uvi);
            return (
              <View key={idx} style={[
                styles.dayCard,
                {
                  backgroundColor: colorScheme === "dark" ? "#232946" : "#f3f6fd",
                  borderColor: colorScheme === "dark" ? "#334155" : "#e0e7ef",
                  shadowColor: colorScheme === "dark" ? "#000" : "#b6c2e2",
                }
              ]}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Image
                    source={{
                      uri: `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`,
                    }}
                    style={{ width: 48, height: 48, marginRight: 12 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dayDate, { color: textColor }]}>{formatDate(day.dt)}</Text>
                    <Text style={[styles.dayDesc, { color: subTextColor, marginTop: 2, fontSize: 15 }]}>
                      {day.weather[0].description}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialCommunityIcons name="weather-pouring" size={18} color={rainColor} />
                      <Text style={{ color: rainColor, fontSize: 13, marginLeft: 2, marginRight: 8 }}>
                        {Math.round(day.pop * 100)}%
                      </Text>
                      <Text style={[styles.dayTemp, { color: textColor }]}>
                        {Math.round(day.temp.max)}° / {Math.round(day.temp.min)}°
                      </Text>
                    </View>
                    {day.rain && (
                      <Text style={{ color: rainColor, fontSize: 13, marginTop: 2 }}>
                        Rain: {day.rain} mm
                      </Text>
                    )}
                    {day.snow && (
                      <Text style={{ color: "#bae6fd", fontSize: 13, marginTop: 2 }}>
                        Snow: {day.snow} mm
                      </Text>
                    )}
                    <Text style={{ color: uv.color, fontSize: 13, marginTop: 2 }}>
                      UV: {day.uvi} ({uv.level})
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  currentWeatherCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  placeText: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  coordsText: {
    fontSize: 13,
    marginBottom: 2,
    fontWeight: "500",
    opacity: 0.8,
  },
  tempText: {
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 2,
  },
  descText: {
    fontSize: 18,
    fontWeight: "500",
    textTransform: "capitalize",
    marginBottom: 2,
  },
  feelsLikeText: {
    fontSize: 14,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginTop: 4,
  },
  infoLabel: {
    color: "#fff",
    fontSize: 13,
    marginLeft: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 12,
  },
  hourCard: {
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    width: 80,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  hourTime: {
    fontSize: 13,
    marginBottom: 2,
  },
  hourTemp: {
    fontWeight: "bold",
    fontSize: 18,
    marginTop: 2,
  },
  dayCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
  },
  dayDate: {
    fontWeight: "bold",
    fontSize: 16,
  },
  dayDesc: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  dayTemp: {
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
});
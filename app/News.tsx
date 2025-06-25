import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

type NewsType = "tip" | "news" | "tutorial";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  date: string;
  type: NewsType;
};

const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "Stay Safe in Emergencies",
    summary: "Always keep your emergency contacts updated in the app.",
    date: "2025-06-20",
    type: "tip",
  },
  {
    id: "2",
    title: "Community Responds Quickly",
    summary: "Average response time to SOS requests is now under 5 minutes.",
    date: "2025-06-18",
    type: "news",
  },
  {
    id: "3",
    title: "How to Use the Map",
    summary: "Learn how to view and report emergencies using the map feature.",
    date: "2025-06-15",
    type: "tutorial",
  },
];

const iconProps: Record<NewsType, { name: string; color: string; bg: string }> = {
  tip: { name: "lightbulb", color: "#10b981", bg: "#f0fdf4" },
  news: { name: "bell", color: "#3b82f6", bg: "#eff6ff" },
  tutorial: { name: "book-open", color: "#ef4444", bg: "#fef2f2" },
};

export default function NewsScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>
        Quick Tips & News
      </Text>
      {mockNews.map((item) => (
        <View
          key={item.id}
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: iconProps[item.type].bg,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <Feather
              name={iconProps[item.type].name as any}
              size={18}
              color={iconProps[item.type].color}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 2 }}>
              {item.title}
            </Text>
            <Text style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>
              {item.summary}
            </Text>
            <Text style={{ color: "#3b82f6", fontSize: 11 }}>{item.date}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
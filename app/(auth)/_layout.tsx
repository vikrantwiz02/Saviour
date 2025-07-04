import React from "react";
import { Stack } from "expo-router";
import { db, storage } from "../../lib/firebase";

export default function AuthLayout() {
  // You don't need to use db or storage here, just importing ensures initialization
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
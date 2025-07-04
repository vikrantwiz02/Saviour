"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
  Image,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Feather, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useColorScheme } from "@/hooks/useColorScheme"
import { db, auth } from "@/lib/firebase"
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore"
import { BlurView } from "expo-blur"

const { width, height } = Dimensions.get("window")

// Enhanced disaster-specific resource categories
const RESOURCE_CATEGORIES = [
  { id: "medical", name: "Medical Supplies", icon: "medical-bag", color: "#ef4444" },
  { id: "food", name: "Food & Water", icon: "food-apple", color: "#10b981" },
  { id: "shelter", name: "Shelter & Clothing", icon: "home-variant", color: "#3b82f6" },
  { id: "rescue", name: "Rescue Equipment", icon: "lifebuoy", color: "#f59e0b" },
  { id: "communication", name: "Communication", icon: "radio", color: "#8b5cf6" },
  { id: "transportation", name: "Transportation", icon: "car", color: "#06b6d4" },
  { id: "tools", name: "Tools & Equipment", icon: "hammer-wrench", color: "#84cc16" },
  { id: "energy", name: "Power & Fuel", icon: "lightning-bolt", color: "#f97316" },
]

// Enhanced theme with modern colors
const modernTheme = {
  light: {
    background: "#f8fafc",
    cardBackground: "#ffffff",
    primary: "#3b82f6",
    primaryLight: "#dbeafe",
    text: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    inputBackground: "#f1f5f9",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    shadow: "rgba(0,0,0,0.1)",
    overlay: "rgba(0,0,0,0.5)",
  },
  dark: {
    background: "#0f172a",
    cardBackground: "#1e293b",
    primary: "#60a5fa",
    primaryLight: "#1e3a8a",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    border: "#334155",
    inputBackground: "#334155",
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
    shadow: "rgba(0,0,0,0.3)",
    overlay: "rgba(0,0,0,0.7)",
  },
}

// Types
type Resource = {
  id: string
  name: string
  description: string
  available: number
  total: number
  city: string
  category: string
  priority: "low" | "medium" | "high" | "critical"
  imageUrl?: string
  createdAt: any
  lastUpdated?: any
  minThreshold: number
  createdBy: string
}

type ResourceRequest = {
  id: string
  resourceId: string
  resourceName: string
  quantity: number
  userId: string
  userName: string
  userPhone?: string
  userEmail?: string
  status: "pending" | "approved" | "rejected" | "fulfilled"
  priority: "low" | "medium" | "high" | "critical"
  createdAt: any
  processedAt?: any
  processedBy?: string
  city: string
  category: string
  urgencyNote?: string
  deliveryAddress?: string
  contactNumber: string
}

type Notification = {
  id: string
  userId: string
  title: string
  message: string
  type: string
  resourceId?: string
  requestId?: string
  createdAt: any
  read: boolean
  city: string
}

const UserResourcesScreen = () => {
  const colorScheme = useColorScheme() ?? "light"
  const colors = modernTheme[colorScheme]
  const currentUser = auth.currentUser

  // States
  const [resources, setResources] = useState<Resource[]>([])
  const [myRequests, setMyRequests] = useState<ResourceRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [requestModalVisible, setRequestModalVisible] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ResourceRequest | null>(null)
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [processing, setProcessing] = useState(false)
  const [userCity, setUserCity] = useState<string>("")

  // Form states
  const [quantity, setQuantity] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium")
  const [urgencyNote, setUrgencyNote] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [contactNumber, setContactNumber] = useState("")

  // Filter states
  const [activeTab, setActiveTab] = useState<"resources" | "requests" | "notifications">("resources")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [availabilityFilter, setAvailabilityFilter] = useState("available")

  // Animations
  const snackbarAnim = React.useRef(new Animated.Value(0)).current
  const modalAnim = React.useRef(new Animated.Value(0)).current

  // Get user's city from user profile
  useEffect(() => {
    const fetchUserCity = async () => {
      if (!currentUser) return

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserCity(userData.city || "DefaultCity")
        } else {
          // Fallback to displayName parsing if user doc doesn't exist
          setUserCity(currentUser.displayName?.split("|")[1] || "DefaultCity")
        }
      } catch (error) {
        console.error("Error fetching user city:", error)
        setUserCity(currentUser.displayName?.split("|")[1] || "DefaultCity")
      }
    }

    fetchUserCity()
  }, [currentUser])

  // Fetch resources, requests, and notifications from Firestore (city-specific)
  useEffect(() => {
    if (!userCity || !currentUser) return

    setLoading(true)

    // Resources query - only for user's city and available resources
    const resourcesQuery = query(collection(db, "resources"), where("city", "==", userCity), orderBy("name", "asc"))

    const resourcesUnsub = onSnapshot(
      resourcesQuery,
      (snapshot) => {
        const data: Resource[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Resource)
        })
        setResources(data)
        setLoading(false)
        setRefreshing(false)
      },
      (error) => {
        console.error("Error fetching resources:", error)
        showSnackbar("Failed to load resources")
        setLoading(false)
        setRefreshing(false)
      },
    )

    // User's requests query
    const requestsQuery = query(
      collection(db, "requests"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
    )

    const requestsUnsub = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data: ResourceRequest[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as ResourceRequest)
        })
        setMyRequests(data)
      },
      (error) => {
        console.error("Error fetching requests:", error)
        showSnackbar("Failed to load your requests")
      },
    )

    // User's notifications query
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
    )

    const notificationsUnsub = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const data: Notification[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Notification)
        })
        setNotifications(data)
      },
      (error) => {
        console.error("Error fetching notifications:", error)
      },
    )

    return () => {
      resourcesUnsub()
      requestsUnsub()
      notificationsUnsub()
    }
  }, [userCity, currentUser])

  // Animations
  useEffect(() => {
    if (snackbarVisible) {
      Animated.sequence([
        Animated.timing(snackbarAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(snackbarAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setSnackbarVisible(false))
    }
  }, [snackbarVisible])

  useEffect(() => {
    Animated.timing(modalAnim, {
      toValue: modalVisible || requestModalVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [modalVisible, requestModalVisible])

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message)
    setSnackbarVisible(true)
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
  }, [])

  const openRequestModal = (resource: Resource) => {
    setSelectedResource(resource)
    setQuantity("")
    setPriority("medium")
    setUrgencyNote("")
    setDeliveryAddress("")
    setContactNumber("")
    setModalVisible(true)
  }

  const openRequestDetailModal = (request: ResourceRequest) => {
    setSelectedRequest(request)
    setRequestModalVisible(true)
  }

  const handleSubmitRequest = async () => {
    if (!selectedResource || !currentUser) return

    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      showSnackbar("Please enter a valid quantity")
      return
    }

    if (Number(quantity) > selectedResource.available) {
      showSnackbar("Requested quantity exceeds available stock")
      return
    }

    if (!contactNumber.trim()) {
      showSnackbar("Contact number is required")
      return
    }

    setProcessing(true)
    try {
      const requestData = {
        resourceId: selectedResource.id,
        resourceName: selectedResource.name,
        quantity: Number(quantity),
        userId: currentUser.uid,
        userName: currentUser.displayName?.split("|")[0] || "Unknown User",
        userEmail: currentUser.email,
        status: "pending" as const,
        priority,
        createdAt: serverTimestamp(),
        city: userCity,
        category: selectedResource.category,
        urgencyNote: urgencyNote.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        contactNumber: contactNumber.trim(),
      }

      await addDoc(collection(db, "requests"), requestData)

      // Create notification for admins
      await addDoc(collection(db, "notifications"), {
        title: "New Resource Request",
        message: `${currentUser.displayName?.split("|")[0] || "A user"} has requested ${quantity} units of ${selectedResource.name}`,
        type: "resource_request",
        resourceId: selectedResource.id,
        userId: "admin", // This will be handled by admin notification system
        city: userCity,
        createdAt: serverTimestamp(),
        read: false,
      })

      showSnackbar("Request submitted successfully")
      setModalVisible(false)
    } catch (error) {
      console.error("Error submitting request:", error)
      showSnackbar("Failed to submit request")
    } finally {
      setProcessing(false)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
        readAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = RESOURCE_CATEGORIES.find((cat) => cat.id === categoryId)
    return category ? category.icon : "package-variant"
  }

  const getCategoryColor = (categoryId: string) => {
    const category = RESOURCE_CATEGORIES.find((cat) => cat.id === categoryId)
    return category ? category.color : colors.primary
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "#ef4444"
      case "high":
        return "#f59e0b"
      case "medium":
        return "#3b82f6"
      case "low":
        return "#10b981"
      default:
        return colors.textSecondary
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10b981"
      case "rejected":
        return "#ef4444"
      case "fulfilled":
        return "#8b5cf6"
      case "pending":
        return "#f59e0b"
      default:
        return colors.textSecondary
    }
  }

  const renderResourceItem = ({ item }: { item: Resource }) => {
    const isAvailable = item.available > 0
    const stockPercentage = (item.available / item.total) * 100

    return (
      <TouchableOpacity
        onPress={() => (isAvailable ? openRequestModal(item) : null)}
        style={[
          styles.modernCard,
          {
            backgroundColor: colors.cardBackground,
            opacity: isAvailable ? 1 : 0.6,
          },
        ]}
        activeOpacity={isAvailable ? 0.7 : 1}
        disabled={!isAvailable}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <MaterialCommunityIcons
              name={getCategoryIcon(item.category) as any}
              size={16}
              color={getCategoryColor(item.category)}
            />
            <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
              {RESOURCE_CATEGORIES.find((cat) => cat.id === item.category)?.name || item.category}
            </Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + "20" }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.resourceImageModern} />}
          <View style={styles.resourceDetails}>
            <Text style={[styles.resourceNameModern, { color: colors.text }]}>{item.name}</Text>
            {item.description && (
              <Text style={[styles.resourceDescModern, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={styles.stockInfo}>
              <View style={styles.stockNumbers}>
                <Text style={[styles.stockText, { color: colors.text }]}>
                  Available:{" "}
                  <Text
                    style={{
                      fontWeight: "600",
                      color: isAvailable ? colors.success : colors.error,
                    }}
                  >
                    {item.available}
                  </Text>
                </Text>
                <Text style={[styles.stockText, { color: colors.textSecondary }]}>Total: {item.total}</Text>
              </View>

              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${stockPercentage}%`,
                      backgroundColor: isAvailable ? colors.success : colors.error,
                    },
                  ]}
                />
              </View>
            </View>

            {isAvailable ? (
              <View style={[styles.availableButton, { backgroundColor: colors.success + "20" }]}>
                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                <Text style={[styles.availableText, { color: colors.success }]}>Available - Tap to Request</Text>
              </View>
            ) : (
              <View style={[styles.unavailableButton, { backgroundColor: colors.error + "20" }]}>
                <MaterialIcons name="cancel" size={16} color={colors.error} />
                <Text style={[styles.unavailableText, { color: colors.error }]}>Out of Stock</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderRequestItem = ({ item }: { item: ResourceRequest }) => (
    <TouchableOpacity
      onPress={() => openRequestDetailModal(item)}
      style={[styles.modernCard, { backgroundColor: colors.cardBackground }]}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + "20" }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.requestContent}>
        <Text style={[styles.requestResourceName, { color: colors.text }]}>{item.resourceName}</Text>
        <Text style={[styles.requestQuantity, { color: colors.textSecondary }]}>Quantity: {item.quantity} units</Text>
        <Text style={[styles.requestTime, { color: colors.textSecondary }]}>
          Requested: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : "N/A"}
        </Text>
        {item.processedAt && (
          <Text style={[styles.requestTime, { color: colors.textSecondary }]}>
            {item.status === "fulfilled" ? "Fulfilled" : "Processed"}: {item.processedAt.toDate().toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => markNotificationAsRead(item.id)}
      style={[
        styles.modernCard,
        {
          backgroundColor: colors.cardBackground,
          borderLeftWidth: 4,
          borderLeftColor: item.read ? colors.border : colors.primary,
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, { color: colors.text }]}>{item.title}</Text>
          {!item.read && <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]} />}
        </View>
        <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>{item.message}</Text>
        <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : "N/A"}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const filteredResources = resources.filter((resource) => {
    if (categoryFilter !== "all" && resource.category !== categoryFilter) return false
    if (availabilityFilter === "available") return resource.available > 0
    if (availabilityFilter === "unavailable") return resource.available === 0
    return true
  })

  const unreadNotifications = notifications.filter((n) => !n.read).length

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error" size={64} color={colors.error} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Authentication Required</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Please log in to access the resource center.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Modern Header */}
      <View style={[styles.modernHeader, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Resource Center</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {userCity} • {filteredResources.filter((r) => r.available > 0).length} Available
            </Text>
          </View>
          <View style={[styles.userIndicator, { backgroundColor: colors.primary + "20" }]}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Modern Tabs */}
      <View style={[styles.modernTabs, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity
          style={[styles.modernTab, activeTab === "resources" && { backgroundColor: colors.primaryLight }]}
          onPress={() => setActiveTab("resources")}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="package-variant"
            size={20}
            color={activeTab === "resources" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.modernTabText, { color: activeTab === "resources" ? colors.primary : colors.textSecondary }]}
          >
            Resources ({filteredResources.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modernTab, activeTab === "requests" && { backgroundColor: colors.primaryLight }]}
          onPress={() => setActiveTab("requests")}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="assignment"
            size={20}
            color={activeTab === "requests" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.modernTabText, { color: activeTab === "requests" ? colors.primary : colors.textSecondary }]}
          >
            My Requests ({myRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modernTab, activeTab === "notifications" && { backgroundColor: colors.primaryLight }]}
          onPress={() => setActiveTab("notifications")}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="notifications"
            size={20}
            color={activeTab === "notifications" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.modernTabText,
              { color: activeTab === "notifications" ? colors.primary : colors.textSecondary },
            ]}
          >
            Notifications ({notifications.length})
          </Text>
          {unreadNotifications > 0 && (
            <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters - Only show for resources tab */}
      {activeTab === "resources" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {["all", "available", "unavailable"].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                {
                  backgroundColor: availabilityFilter === filter ? colors.primary : colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setAvailabilityFilter(filter)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, { color: availabilityFilter === filter ? "#fff" : colors.text }]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}

          {RESOURCE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: categoryFilter === cat.id ? cat.color : colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setCategoryFilter(categoryFilter === cat.id ? "all" : cat.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={cat.icon as any}
                size={16}
                color={categoryFilter === cat.id ? "#fff" : cat.color}
              />
              <Text style={[styles.filterChipText, { color: categoryFilter === cat.id ? "#fff" : colors.text }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading {activeTab}...</Text>
        </View>
      ) : (
        <>
          {activeTab === "resources" && (
            <FlatList<Resource>
              data={filteredResources}
              keyExtractor={(item) => item.id}
              renderItem={renderResourceItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="inventory" size={64} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Resources Found</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    No resources match your current filters.
                  </Text>
                </View>
              }
            />
          )}
          {activeTab === "requests" && (
            <FlatList<ResourceRequest>
              data={myRequests}
              keyExtractor={(item) => item.id}
              renderItem={renderRequestItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="assignment" size={64} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requests Found</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    You haven't made any requests yet.
                  </Text>
                </View>
              }
            />
          )}
          {activeTab === "notifications" && (
            <FlatList<Notification>
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotificationItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="notifications" size={64} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications Found</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    You have no notifications at this time.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Request Submission Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <BlurView intensity={50} style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modernModalContent,
              {
                backgroundColor: colors.cardBackground,
                opacity: modalAnim,
                transform: [{ scale: modalAnim }],
              },
            ]}
          >
            {selectedResource && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Request Resource</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                    <Feather name="x" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                  <View style={styles.resourcePreview}>
                    {selectedResource.imageUrl && (
                      <Image source={{ uri: selectedResource.imageUrl }} style={styles.previewImage} />
                    )}
                    <View style={styles.previewDetails}>
                      <Text style={[styles.previewTitle, { color: colors.text }]}>{selectedResource.name}</Text>
                      <Text style={[styles.previewAvailable, { color: colors.success }]}>
                        Available: {selectedResource.available} units
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Request Details</Text>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity Needed *</Text>
                      <TextInput
                        value={quantity}
                        onChangeText={setQuantity}
                        style={[
                          styles.modernInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                          },
                        ]}
                        placeholder={`Max: ${selectedResource.available}`}
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Contact Number *</Text>
                      <TextInput
                        value={contactNumber}
                        onChangeText={setContactNumber}
                        style={[
                          styles.modernInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                          },
                        ]}
                        placeholder="Your contact number"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Priority Level</Text>
                      <View style={styles.prioritySelector}>
                        {["low", "medium", "high", "critical"].map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[
                              styles.priorityOption,
                              {
                                backgroundColor: priority === p ? getPriorityColor(p) : colors.inputBackground,
                                borderColor: getPriorityColor(p),
                              },
                            ]}
                            onPress={() => setPriority(p as any)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.priorityOptionText, { color: priority === p ? "#fff" : colors.text }]}>
                              {p.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Delivery Address</Text>
                      <TextInput
                        value={deliveryAddress}
                        onChangeText={setDeliveryAddress}
                        style={[
                          styles.modernTextArea,
                          {
                            color: colors.text,
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                          },
                        ]}
                        placeholder="Where should we deliver this resource?"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Urgency Note</Text>
                      <TextInput
                        value={urgencyNote}
                        onChangeText={setUrgencyNote}
                        style={[
                          styles.modernTextArea,
                          {
                            color: colors.text,
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                          },
                        ]}
                        placeholder="Explain why you need this resource urgently (optional)"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[styles.modernButton, styles.cancelButton, { borderColor: colors.border }]}
                    disabled={processing}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmitRequest}
                    style={[styles.modernButton, styles.submitButton, { backgroundColor: colors.primary }]}
                    disabled={processing}
                    activeOpacity={0.7}
                  >
                    {processing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="send" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>Submit Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        visible={requestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <BlurView intensity={50} style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modernModalContent,
              {
                backgroundColor: colors.cardBackground,
                opacity: modalAnim,
                transform: [{ scale: modalAnim }],
              },
            ]}
          >
            {selectedRequest && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Request Details</Text>
                  <TouchableOpacity onPress={() => setRequestModalVisible(false)} style={styles.closeButton}>
                    <Feather name="x" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                  <View style={styles.requestDetailCard}>
                    <View style={styles.requestDetailHeader}>
                      <Text style={[styles.requestDetailTitle, { color: colors.text }]}>
                        {selectedRequest.resourceName}
                      </Text>
                      <View
                        style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRequest.status) + "20" }]}
                      >
                        <Text style={[styles.statusText, { color: getStatusColor(selectedRequest.status) }]}>
                          {selectedRequest.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.requestDetailGrid}>
                      <View style={styles.requestDetailItem}>
                        <MaterialIcons name="inventory" size={20} color={colors.textSecondary} />
                        <View style={styles.requestDetailContent}>
                          <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                            Quantity Requested
                          </Text>
                          <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                            {selectedRequest.quantity} units
                          </Text>
                        </View>
                      </View>

                      <View style={styles.requestDetailItem}>
                        <MaterialIcons name="flag" size={20} color={colors.textSecondary} />
                        <View style={styles.requestDetailContent}>
                          <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                            Priority Level
                          </Text>
                          <Text
                            style={[styles.requestDetailValue, { color: getPriorityColor(selectedRequest.priority) }]}
                          >
                            {selectedRequest.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.requestDetailItem}>
                        <MaterialIcons name="schedule" size={20} color={colors.textSecondary} />
                        <View style={styles.requestDetailContent}>
                          <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>Requested On</Text>
                          <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                            {selectedRequest.createdAt?.toDate
                              ? selectedRequest.createdAt.toDate().toLocaleString()
                              : "N/A"}
                          </Text>
                        </View>
                      </View>

                      {selectedRequest.processedAt && (
                        <View style={styles.requestDetailItem}>
                          <MaterialIcons name="check-circle" size={20} color={colors.textSecondary} />
                          <View style={styles.requestDetailContent}>
                            <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                              {selectedRequest.status === "fulfilled" ? "Fulfilled On" : "Processed On"}
                            </Text>
                            <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                              {selectedRequest.processedAt.toDate().toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.requestDetailItem}>
                        <MaterialIcons name="phone" size={20} color={colors.textSecondary} />
                        <View style={styles.requestDetailContent}>
                          <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                            Contact Number
                          </Text>
                          <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                            {selectedRequest.contactNumber}
                          </Text>
                        </View>
                      </View>

                      {selectedRequest.deliveryAddress && (
                        <View style={styles.requestDetailItem}>
                          <MaterialIcons name="location-on" size={20} color={colors.textSecondary} />
                          <View style={styles.requestDetailContent}>
                            <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                              Delivery Address
                            </Text>
                            <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                              {selectedRequest.deliveryAddress}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {selectedRequest.urgencyNote && (
                      <View style={[styles.urgencyCard, { backgroundColor: colors.warning + "10" }]}>
                        <MaterialIcons name="warning" size={20} color={colors.warning} />
                        <Text style={[styles.urgencyText, { color: colors.warning }]}>
                          <Text style={{ fontWeight: "600" }}>Urgency Note: </Text>
                          {selectedRequest.urgencyNote}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Modern Snackbar */}
      {snackbarVisible && (
        <Animated.View
          style={[
            styles.modernSnackbar,
            {
              backgroundColor: colors.cardBackground,
              opacity: snackbarAnim,
              transform: [
                {
                  translateY: snackbarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialIcons name="info" size={20} color={colors.primary} />
          <Text style={[styles.snackbarText, { color: colors.text }]}>{snackbarMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  userIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  modernTabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  modernTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 2,
    position: "relative",
  },
  modernTabText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  filtersContainer: {
    maxHeight: 60,
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  modernCard: {
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  resourceImageModern: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  resourceDetails: {
    flex: 1,
  },
  resourceNameModern: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  resourceDescModern: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  stockInfo: {
    marginTop: 8,
    marginBottom: 12,
  },
  stockNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  stockText: {
    fontSize: 13,
    fontWeight: "500",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  availableButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  availableText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  unavailableButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unavailableText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  requestContent: {
    marginTop: 8,
  },
  requestResourceName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  requestQuantity: {
    fontSize: 14,
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    marginBottom: 2,
  },
  notificationContent: {
    padding: 4,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modernModalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: height * 0.9,
    borderRadius: 20,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollView: {
    flex: 1,
    padding: 20,
  },
  resourcePreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
    marginBottom: 24,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  previewDetails: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewAvailable: {
    fontSize: 14,
    fontWeight: "500",
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  modernInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  modernTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: "500",
    height: 100,
    textAlignVertical: "top",
  },
  prioritySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  priorityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  modernButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    marginRight: 12,
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  submitButton: {
    minWidth: 140,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  requestDetailCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  requestDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  requestDetailTitle: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  requestDetailGrid: {
    marginBottom: 16,
  },
  requestDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  requestDetailContent: {
    marginLeft: 12,
    flex: 1,
  },
  requestDetailLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  requestDetailValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  urgencyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  modernSnackbar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 40,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  snackbarText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
})

export default UserResourcesScreen

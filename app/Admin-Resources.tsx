import React, { useState, useEffect, useCallback } from "react";
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
  Platform,
  Pressable,
  Animated,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Feather, 
  MaterialIcons, 
  Ionicons, 
  MaterialCommunityIcons,
  FontAwesome5 
} from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { db, auth, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Enhanced disaster-specific resource categories
const RESOURCE_CATEGORIES = [
  { id: 'medical', name: 'Medical Supplies', icon: 'medical-bag', color: '#ef4444' },
  { id: 'food', name: 'Food & Water', icon: 'food-apple', color: '#10b981' },
  { id: 'shelter', name: 'Shelter & Clothing', icon: 'home-variant', color: '#3b82f6' },
  { id: 'rescue', name: 'Rescue Equipment', icon: 'lifebuoy', color: '#f59e0b' },
  { id: 'communication', name: 'Communication', icon: 'radio', color: '#8b5cf6' },
  { id: 'transportation', name: 'Transportation', icon: 'car', color: '#06b6d4' },
  { id: 'tools', name: 'Tools & Equipment', icon: 'hammer-wrench', color: '#84cc16' },
  { id: 'energy', name: 'Power & Fuel', icon: 'lightning-bolt', color: '#f97316' },
];

const DISASTER_RESOURCES = {
  medical: [
    'First Aid Kits', 'Bandages', 'Antiseptics', 'Pain Relievers', 'Antibiotics',
    'Blood Bags', 'Oxygen Tanks', 'Stretchers', 'Defibrillators', 'Surgical Kits'
  ],
  food: [
    'Drinking Water', 'Canned Food', 'Dry Rations', 'Baby Formula', 'Energy Bars',
    'Water Purification Tablets', 'Cooking Gas', 'Emergency Food Packets'
  ],
  shelter: [
    'Tents', 'Blankets', 'Sleeping Bags', 'Tarpaulins', 'Emergency Clothing',
    'Mattresses', 'Pillows', 'Raincoats', 'Winter Jackets'
  ],
  rescue: [
    'Life Jackets', 'Ropes', 'Helmets', 'Flashlights', 'Megaphones',
    'Rescue Boats', 'Ladders', 'Cutting Tools', 'Safety Harnesses'
  ],
  communication: [
    'Walkie Talkies', 'Satellite Phones', 'Emergency Radios', 'Signal Flares',
    'Whistles', 'Mobile Chargers', 'Power Banks', 'Antennas'
  ],
  transportation: [
    'Ambulances', 'Rescue Vehicles', 'Boats', 'Helicopters', 'Motorcycles',
    'Bicycles', 'Fuel', 'Vehicle Parts'
  ],
  tools: [
    'Generators', 'Chainsaws', 'Shovels', 'Pickaxes', 'Crowbars',
    'Tool Kits', 'Heavy Machinery', 'Pumps', 'Hoses'
  ],
  energy: [
    'Portable Generators', 'Solar Panels', 'Batteries', 'Fuel Cans',
    'Power Cables', 'Inverters', 'Emergency Lights', 'Charging Stations'
  ]
};

// Enhanced theme with modern colors
const modernTheme = {
  light: {
    background: '#f8fafc',
    cardBackground: '#ffffff',
    primary: '#3b82f6',
    primaryLight: '#dbeafe',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    inputBackground: '#f1f5f9',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    shadow: 'rgba(0,0,0,0.1)',
    overlay: 'rgba(0,0,0,0.5)',
  },
  dark: {
    background: '#0f172a',
    cardBackground: '#1e293b',
    primary: '#60a5fa',
    primaryLight: '#1e3a8a',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    inputBackground: '#334155',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    shadow: 'rgba(0,0,0,0.3)',
    overlay: 'rgba(0,0,0,0.7)',
  }
};

// Types
type Resource = {
  id: string;
  name: string;
  description: string;
  available: number;
  total: number;
  city: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  imageUrl?: string;
  createdAt: any;
  lastUpdated?: any;
  minThreshold: number;
};

type ResourceRequest = {
  id: string;
  resourceName: string;
  quantity: number;
  userId: string;
  userName: string;
  userPhone?: string;
  status: "pending" | "approved" | "rejected";
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: any;
  city: string;
  category: string;
  urgencyNote?: string;
};

const AdminResourcesScreen = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = modernTheme[colorScheme];
  const currentUser = auth.currentUser;

  // States
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ResourceRequest | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [available, setAvailable] = useState("");
  const [category, setCategory] = useState("medical");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [minThreshold, setMinThreshold] = useState("");
  const [imageUri, setImageUri] = useState("");

  // Filter states
  const [activeTab, setActiveTab] = useState<'resources' | 'requests'>('resources');
  const [resourceFilter, setResourceFilter] = useState("all");
  const [requestFilter, setRequestFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Animations
  const snackbarAnim = React.useRef(new Animated.Value(0)).current;
  const modalAnim = React.useRef(new Animated.Value(0)).current;
  const tabAnim = React.useRef(new Animated.Value(0)).current;

  // Get admin's city from user profile
  const adminCity = currentUser?.displayName?.split("|")[1] || "DefaultCity";

  // Fetch resources and requests from Firestore (city-specific)
  useEffect(() => {
    if (!adminCity) return;

    setLoading(true);

    // Resources query - only for admin's city
    const resourcesQuery = query(
      collection(db, "resources"),
      where("city", "==", adminCity),
      orderBy("name", "asc")
    );

    const resourcesUnsub = onSnapshot(
      resourcesQuery,
      (snapshot) => {
        const data: Resource[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Resource);
        });
        setResources(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error fetching resources:", error);
        showSnackbar("Failed to load resources");
        setLoading(false);
        setRefreshing(false);
      }
    );

    // Requests query - only for admin's city
    const requestsQuery = query(
      collection(db, "requests"),
      where("city", "==", adminCity),
      orderBy("createdAt", "desc")
    );

    const requestsUnsub = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data: ResourceRequest[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as ResourceRequest);
        });
        setRequests(data);
      },
      (error) => {
        console.error("Error fetching requests:", error);
        showSnackbar("Failed to load requests");
      }
    );

    return () => {
      resourcesUnsub();
      requestsUnsub();
    };
  }, [adminCity]);

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
      ]).start(() => setSnackbarVisible(false));
    }
  }, [snackbarVisible]);

  useEffect(() => {
    Animated.timing(modalAnim, {
      toValue: modalVisible || requestModalVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [modalVisible, requestModalVisible]);

  useEffect(() => {
    Animated.timing(tabAnim, {
      toValue: activeTab === 'resources' ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const openAddModal = () => {
    setMode("add");
    setName("");
    setDescription("");
    setTotal("");
    setAvailable("");
    setCategory("medical");
    setPriority("medium");
    setMinThreshold("");
    setImageUri("");
    setModalVisible(true);
  };

  const openEditModal = (resource: Resource) => {
    setMode("edit");
    setSelectedResource(resource);
    setName(resource.name);
    setDescription(resource.description);
    setTotal(resource.total.toString());
    setAvailable(resource.available.toString());
    setCategory(resource.category);
    setPriority(resource.priority);
    setMinThreshold(resource.minThreshold?.toString() || "");
    setImageUri(resource.imageUrl || "");
    setModalVisible(true);
  };

  const openRequestModal = (request: ResourceRequest) => {
    setSelectedRequest(request);
    setRequestModalVisible(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!imageUri || imageUri.startsWith("http")) return imageUri;

    try {
      setImageUploading(true);
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `resource-images/${adminCity}/${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (error) {
      console.error("Upload error:", error);
      showSnackbar("Failed to upload image");
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showSnackbar("Resource name is required");
      return;
    }
    if (!total.trim() || isNaN(Number(total)) || Number(total) <= 0) {
      showSnackbar("Please enter a valid total quantity");
      return;
    }
    if (!available.trim() || isNaN(Number(available)) || Number(available) < 0) {
      showSnackbar("Please enter a valid available quantity");
      return;
    }
    if (Number(available) > Number(total)) {
      showSnackbar("Available cannot be greater than total");
      return;
    }

    setProcessing(true);
    try {
      const imageUrl = await uploadImage();

      const resourceData = {
        name: name.trim(),
        description: description.trim(),
        total: Number(total),
        available: Number(available),
        city: adminCity,
        category,
        priority,
        minThreshold: Number(minThreshold) || 5,
        imageUrl: imageUrl || null,
        lastUpdated: new Date(),
        ...(mode === "add" && { createdAt: new Date() }),
      };

      if (mode === "add") {
        await addDoc(collection(db, "resources"), resourceData);
        showSnackbar("Resource added successfully");
      } else if (selectedResource) {
        await updateDoc(doc(db, "resources", selectedResource.id), resourceData);
        showSnackbar("Resource updated successfully");
      }

      setModalVisible(false);
    } catch (error) {
      console.error("Error saving resource:", error);
      showSnackbar("Failed to save resource");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedResource) return;

    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${selectedResource.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "resources", selectedResource.id));
              showSnackbar("Resource deleted successfully");
              setModalVisible(false);
            } catch (error) {
              console.error("Error deleting resource:", error);
              showSnackbar("Failed to delete resource");
            }
          },
        },
      ]
    );
  };

  const handleRequestAction = async (action: "approve" | "reject") => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      await updateDoc(doc(db, "requests", selectedRequest.id), {
        status: action === "approve" ? "approved" : "rejected",
        processedAt: new Date(),
        processedBy: currentUser?.uid,
      });

      if (action === "approve") {
        const resource = resources.find(
          r => r.name === selectedRequest.resourceName && r.city === selectedRequest.city
        );
        if (resource) {
          const newAvailable = resource.available - selectedRequest.quantity;
          if (newAvailable < 0) {
            showSnackbar("Not enough resources available");
            return;
          }
          await updateDoc(doc(db, "resources", resource.id), {
            available: newAvailable,
            lastUpdated: new Date(),
          });
        }
      }

      showSnackbar(`Request ${action === "approve" ? "approved" : "rejected"}`);
      setRequestModalVisible(false);
    } catch (error) {
      console.error("Error processing request:", error);
      showSnackbar("Failed to process request");
    } finally {
      setProcessing(false);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = RESOURCE_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.icon : 'package-variant';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = RESOURCE_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.color : colors.primary;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return colors.textSecondary;
    }
  };

  const renderResourceItem = ({ item }: { item: Resource }) => {
    const isLowStock = item.available <= item.minThreshold;
    const stockPercentage = (item.available / item.total) * 100;

    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        style={[styles.modernCard, { backgroundColor: colors.cardBackground }]}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <MaterialCommunityIcons
              name={getCategoryIcon(item.category) as any}
              size={16}
              color={getCategoryColor(item.category)}
            />
            <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
              {RESOURCE_CATEGORIES.find(cat => cat.id === item.category)?.name || item.category}
            </Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.resourceImageModern} />
          )}
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
                  Available: <Text style={{ fontWeight: '600', color: isLowStock ? colors.error : colors.success }}>
                    {item.available}
                  </Text>
                </Text>
                <Text style={[styles.stockText, { color: colors.textSecondary }]}>
                  Total: {item.total}
                </Text>
              </View>
              
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${stockPercentage}%`,
                      backgroundColor: isLowStock ? colors.error : colors.success 
                    }
                  ]} 
                />
              </View>
              
              {isLowStock && (
                <View style={styles.lowStockWarning}>
                  <MaterialIcons name="warning" size={14} color={colors.warning} />
                  <Text style={[styles.lowStockText, { color: colors.warning }]}>Low Stock</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestItem = ({ item }: { item: ResourceRequest }) => (
    <TouchableOpacity
      onPress={() => openRequestModal(item)}
      style={[styles.modernCard, { backgroundColor: colors.cardBackground }]}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.requestContent}>
        <Text style={[styles.requestResourceName, { color: colors.text }]}>{item.resourceName}</Text>
        <Text style={[styles.requestQuantity, { color: colors.textSecondary }]}>
          Quantity: {item.quantity} units
        </Text>
        <Text style={[styles.requestUser, { color: colors.textSecondary }]}>
          Requested by: {item.userName || "Unknown User"}
        </Text>
        {item.urgencyNote && (
          <Text style={[styles.urgencyNote, { color: colors.warning }]}>
            Note: {item.urgencyNote}
          </Text>
        )}
        <Text style={[styles.requestTime, { color: colors.textSecondary }]}>
          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : "N/A"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filteredResources = resources.filter((resource) => {
    if (categoryFilter !== "all" && resource.category !== categoryFilter) return false;
    if (resourceFilter === "available") return resource.available > 0;
    if (resourceFilter === "low") return resource.available <= resource.minThreshold;
    if (resourceFilter === "critical") return resource.priority === "critical";
    return true;
  });

  const filteredRequests = requests.filter((request) => {
    if (requestFilter === "all") return true;
    return request.status === requestFilter;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      {/* Modern Header */}
      <View style={[styles.modernHeader, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Resource Center</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {adminCity} • {resources.length} Resources
            </Text>
          </View>
          <TouchableOpacity 
            onPress={openAddModal}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modern Tabs */}
      <View style={[styles.modernTabs, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity
          style={[
            styles.modernTab,
            activeTab === 'resources' && { backgroundColor: colors.primaryLight }
          ]}
          onPress={() => setActiveTab('resources')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons 
            name="package-variant" 
            size={20} 
            color={activeTab === 'resources' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.modernTabText,
            { color: activeTab === 'resources' ? colors.primary : colors.textSecondary }
          ]}>
            Resources ({filteredResources.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modernTab,
            activeTab === 'requests' && { backgroundColor: colors.primaryLight }
          ]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name="assignment" 
            size={20} 
            color={activeTab === 'requests' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.modernTabText,
            { color: activeTab === 'requests' ? colors.primary : colors.textSecondary }
          ]}>
            Requests ({filteredRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {activeTab === 'resources' ? (
          <>
            {['all', 'available', 'low', 'critical'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: resourceFilter === filter ? colors.primary : colors.inputBackground,
                    borderColor: colors.border 
                  }
                ]}
                onPress={() => setResourceFilter(filter)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: resourceFilter === filter ? '#fff' : colors.text }
                ]}>
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
                    borderColor: colors.border 
                  }
                ]}
                onPress={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name={cat.icon as any} 
                  size={16} 
                  color={categoryFilter === cat.id ? '#fff' : cat.color} 
                />
                <Text style={[
                  styles.filterChipText,
                  { color: categoryFilter === cat.id ? '#fff' : colors.text }
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          ['all', 'pending', 'approved', 'rejected'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: requestFilter === filter ? colors.primary : colors.inputBackground,
                  borderColor: colors.border 
                }
              ]}
              onPress={() => setRequestFilter(filter)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText,
                { color: requestFilter === filter ? '#fff' : colors.text }
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading resources...
          </Text>
        </View>
      ) : 
        activeTab === 'resources' ? (
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
          />
        ) : (
          <FlatList<ResourceRequest>
            data={filteredRequests}
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
          />
        )
      }

      {/* Resource Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={50} style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modernModalContent,
              { 
                backgroundColor: colors.cardBackground,
                opacity: modalAnim,
                transform: [{ scale: modalAnim }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {mode === "add" ? "Add Resource" : "Edit Resource"}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Image Upload */}
              <TouchableOpacity
                style={[styles.modernImageUpload, { borderColor: colors.border }]}
                onPress={pickImage}
                disabled={imageUploading}
                activeOpacity={0.7}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialCommunityIcons
                      name="camera-plus"
                      size={40}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
                      Add Photo
                    </Text>
                  </View>
                )}
                {imageUploading && (
                  <View style={styles.imageUploadOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Form Fields */}
              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Resource Name *</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={[styles.modernInput, { 
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border 
                    }]}
                    placeholder="Enter resource name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    style={[styles.modernTextArea, { 
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border 
                    }]}
                    placeholder="Enter description"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Total Quantity *</Text>
                    <TextInput
                      value={total}
                      onChangeText={setTotal}
                      style={[styles.modernInput, { 
                        color: colors.text,
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.border 
                      }]}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Available *</Text>
                    <TextInput
                      value={available}
                      onChangeText={setAvailable}
                      style={[styles.modernInput, { 
                        color: colors.text,
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.border 
                      }]}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Minimum Threshold</Text>
                  <TextInput
                    value={minThreshold}
                    onChangeText={setMinThreshold}
                    style={[styles.modernInput, { 
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border 
                    }]}
                    placeholder="5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Classification</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Category *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categorySelector}>
                      {RESOURCE_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryOption,
                            { 
                              backgroundColor: category === cat.id ? cat.color : colors.inputBackground,
                              borderColor: cat.color 
                            }
                          ]}
                          onPress={() => setCategory(cat.id)}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons
                            name={cat.icon as any}
                            size={20}
                            color={category === cat.id ? '#fff' : cat.color}
                          />
                          <Text style={[
                            styles.categoryOptionText,
                            { color: category === cat.id ? '#fff' : colors.text }
                          ]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Priority Level *</Text>
                  <View style={styles.prioritySelector}>
                    {['low', 'medium', 'high', 'critical'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityOption,
                          { 
                            backgroundColor: priority === p ? getPriorityColor(p) : colors.inputBackground,
                            borderColor: getPriorityColor(p)
                          }
                        ]}
                        onPress={() => setPriority(p as any)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.priorityOptionText,
                          { color: priority === p ? '#fff' : colors.text }
                        ]}>
                          {p.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Quick Add Suggestions */}
              {category && DISASTER_RESOURCES[category as keyof typeof DISASTER_RESOURCES] && (
                <View style={styles.formSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Add</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.quickAddContainer}>
                      {DISASTER_RESOURCES[category as keyof typeof DISASTER_RESOURCES].map((resourceName) => (
                        <TouchableOpacity
                          key={resourceName}
                          style={[styles.quickAddChip, { 
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border 
                          }]}
                          onPress={() => setName(resourceName)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.quickAddText, { color: colors.text }]}>
                            {resourceName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              {mode === "edit" && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={[styles.modernButton, styles.deleteButton]}
                  disabled={processing}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="delete" size={20} color="#ef4444" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}

              <View style={styles.primaryActions}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.modernButton, styles.cancelButton, { borderColor: colors.border }]}
                  disabled={processing}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[styles.modernButton, styles.submitButton, { backgroundColor: colors.primary }]}
                  disabled={processing}
                  activeOpacity={0.7}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {mode === "add" ? "Add Resource" : "Save Changes"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Request Modal */}
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
                transform: [{ scale: modalAnim }]
              }
            ]}
          >
            {selectedRequest && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Request Details
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setRequestModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Feather name="x" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                  <View style={styles.requestDetailCard}>
                    <View style={styles.requestDetailHeader}>
                      <Text style={[styles.requestDetailTitle, { color: colors.text }]}>
                        {selectedRequest.resourceName}
                      </Text>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: getStatusColor(selectedRequest.status) + '20' }
                      ]}>
                        <Text style={[
                          styles.statusText, 
                          { color: getStatusColor(selectedRequest.status) }
                        ]}>
                          {selectedRequest.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.requestDetailGrid}>
                      <View style={styles.requestDetailItem}>
                        <MaterialIcons name="inventory" size={20} color={colors.textSecondary} />
                        <View style={styles.requestDetailContent}>
                          <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                            Quantity
                          </Text>
                          <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                            {selectedRequest.quantity} units
                          </Text>
                        </View>
                      </View>

                      <View style={styles.requestDetailItem}>
                        <MaterialIcons name="person" size={20} color={colors.textSecondary} />
                        <View style={styles.requestDetailContent}>
                          <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                            Requester
                          </Text>
                          <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                            {selectedRequest.userName || "Unknown"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.requestDetailItem}>
                        <MaterialIcons name="flag" size={20} color={colors.textSecondary} />
                        <View style={styles.requestDetailContent}>
                          <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                            Priority
                          </Text>
                          <Text style={[
                            styles.requestDetailValue, 
                            { color: getPriorityColor(selectedRequest.priority) }
                          ]}>
                            {selectedRequest.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.requestDetailItem}>
                        <MaterialIcons name="schedule" size={20} color={colors.textSecondary} />
                        <View style={styles.requestDetailContent}>
                          <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>
                            Requested
                          </Text>
                          <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                            {selectedRequest.createdAt?.toDate
                              ? selectedRequest.createdAt.toDate().toLocaleString()
                              : "N/A"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {selectedRequest.urgencyNote && (
                      <View style={[styles.urgencyCard, { backgroundColor: colors.warning + '10' }]}>
                        <MaterialIcons name="warning" size={20} color={colors.warning} />
                        <Text style={[styles.urgencyText, { color: colors.warning }]}>
                          {selectedRequest.urgencyNote}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {selectedRequest.status === "pending" && (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      onPress={() => handleRequestAction("reject")}
                      style={[styles.modernButton, styles.rejectButton]}
                      disabled={processing}
                      activeOpacity={0.7}
                    >
                      {processing ? (
                        <ActivityIndicator color="#ef4444" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="close" size={20} color="#ef4444" />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRequestAction("approve")}
                      style={[styles.modernButton, styles.approveButton]}
                      disabled={processing}
                      activeOpacity={0.7}
                    >
                      {processing ? (
                        <ActivityIndicator color="#10b981" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="check" size={20} color="#10b981" />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
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
          <Text style={[styles.snackbarText, { color: colors.text }]}>
            {snackbarMessage}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    marginHorizontal: 4,
  },
  modernTabText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
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
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  lowStockWarning: {
    flexDirection: "row",
    alignItems: "center",
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
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
  requestUser: {
    fontSize: 14,
    marginBottom: 4,
  },
  urgencyNote: {
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 8,
  },
  requestTime: {
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
    maxHeight: "100%",
    minHeight: "100%",
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
  modernImageUpload: {
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  imageUploadOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
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
  row: {
    flexDirection: "row",
  },
  categorySelector: {
    flexDirection: "row",
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    minWidth: 120,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
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
  quickAddContainer: {
    flexDirection: "row",
  },
  quickAddChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  deleteButton: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  deleteButtonText: {
    color: "#ef4444",
    fontWeight: "600",
    marginLeft: 6,
  },
  primaryActions: {
    flexDirection: "row",
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
    alignItems: "center",
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
  requestActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  rejectButton: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#ef4444",
    marginRight: 12,
  },
  rejectButtonText: {
    color: "#ef4444",
    fontWeight: "600",
    marginLeft: 6,
  },
  approveButton: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#10b981",
  },
  approveButtonText: {
    color: "#10b981",
    fontWeight: "600",
    marginLeft: 6,
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
});

export default AdminResourcesScreen;